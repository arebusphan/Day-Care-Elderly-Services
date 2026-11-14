// E2E cho tính năng Đợt 2–4, gọi qua service FE thật (Vite SSR). node api-e2e-v2.mjs <FE_ROOT> <ACCOUNTS_JSON> <OUT>
import { pathToFileURL } from "node:url";
import fs from "node:fs";

const [FE_ROOT, ACC, OUT] = process.argv.slice(2);
const acc = JSON.parse(fs.readFileSync(ACC, "utf8")).accounts;
const { createServer } = await import(pathToFileURL(`${FE_ROOT}/node_modules/vite/dist/node/index.js`).href);
const store = new Map();
globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
globalThis.window = { dispatchEvent() {}, addEventListener() {}, removeEventListener() {} };
const vite = await createServer({ root: FE_ROOT, logLevel: "error", server: { middlewareMode: true, hmr: false }, appType: "custom" });
const mod = async (p) => { const m = await vite.ssrLoadModule(p); return m.default ?? m; };
const svc = {
  auth: (await vite.ssrLoadModule("/src/services/authService.ts")).authService,
  overview: await mod("/src/services/overviewService.ts"),
  profile: await mod("/src/services/centerProfileService.ts"),
  pickup: await mod("/src/services/pickupAbsenceService.ts"),
  msg: await mod("/src/services/messageService.ts"),
  req: await mod("/src/services/staffRequestService.ts"),
  att: await mod("/src/services/attendanceService.ts"),
  inc: await mod("/src/services/incidentReportService.ts"),
  sup: await mod("/src/services/medicalSupplyService.ts"),
  plan: await mod("/src/services/dailyPlanningService.ts"),
  billing: (await vite.ssrLoadModule("/src/services/billingApiService.ts")).billingApiService,
  elderly: await mod("/src/services/elderlyService.ts"),
  notif: await mod("/src/services/notificationService.ts"),
  api: await mod("/src/services/api.ts"),
};
const results = [];
let role = "";
async function step(name, fn, expectFail = false) {
  try {
    const r = await fn();
    const ok = !(r && typeof r === "object" && "success" in r && r.success === false);
    results.push({ role, name, status: ok !== expectFail ? "PASS" : "FAIL", msg: ok ? (expectFail ? "không bị chặn" : "") : r.message });
    return r;
  } catch (e) {
    const http = e?.response?.status ?? 0;
    const msg = e?.response?.data?.message ?? e.message;
    results.push({ role, name, status: expectFail && http >= 400 && http < 500 ? "PASS" : http >= 500 || http === 0 ? "ERROR" : `HTTP ${http}`, msg: String(msg).slice(0, 200) });
    return undefined;
  }
}
const d = (r) => r?.data;
const login = async (who, cred) => { role = who; const r = await svc.auth.login(cred); localStorage.setItem("auth_token", r.data.token); return r.data.user; };
const pad = (n) => String(n).padStart(2, "0");
const iso = (x) => `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
const TODAY = iso(new Date());
const plusWorking = (n) => { const x = new Date(); let k = 0; while (k < n) { x.setDate(x.getDate() + 1); if (x.getDay() !== 0) k++; } return iso(x); };
const eid = acc.famElderlyId;

// ── Admin / Manager ──
await login("Manager", acc.qaManager);
await step("dashboard", () => svc.overview.centerDashboard());
await step("reports 30 ngày", () => svc.overview.centerReport(plusWorking(0).slice(0, 8) + "01", TODAY));
await step("staff profile get", () => svc.profile.getStaffProfile(acc.qaStaffId));
await step("staff profile update", () => svc.profile.updateStaffProfile(acc.qaStaffId, { fullName: "QA Nhân Viên", phoneNumber: "0900000003", position: "Điều dưỡng", qualification: "Chứng chỉ điều dưỡng QA", startDate: "2026-01-05" }));
await step("staff profile phone sai bị chặn", () => svc.profile.updateStaffProfile(acc.qaStaffId, { fullName: "QA", phoneNumber: "abc" }), true);
const det = await step("elderly detail", () => svc.profile.getElderly(eid));
if (d(det)) {
  const { elderlyId, isActive, familyContacts, activePackages, assignedStaffToday, ...rest } = d(det);
  await step("elderly update (xác nhận Support)", () => svc.profile.updateElderly(eid, { ...rest, mobilityStatus: "Support", careNotes: "QA manager cập nhật" }));
  await step("elderly deactivate", () => svc.profile.setElderlyActive(eid, false));
  await step("inactive list có cụ", async () => { const r = await svc.profile.getInactiveElderly(); return { success: r.data.some((x) => x.elderlyId === eid) }; });
  await step("elderly reactivate", () => svc.profile.setElderlyActive(eid, true));
}
const nextPlan = await step("plan next day", () => svc.plan.getOrInitPlan(plusWorking(1)));
if (d(nextPlan)) {
  await step("generate (để có nhóm)", () => svc.plan.generateAssignment(d(nextPlan).planId));
  await step("AI suggest (không key → luật)", async () => {
    const r = (await svc.api.post(`/api/center/planning/${d(nextPlan).planId}/ai-suggest`)).data;
    return { success: r.success && r.data.suggestions.length > 0, message: `${r.data?.source} ${r.data?.suggestions.length} nhóm` };
  });
}

// ── Family ──
await login("Family", acc.qaFamily);
await step("family overview", () => svc.overview.familyOverview());
const p1 = await step("pickup add", () => svc.pickup.addPickup(eid, { fullName: "QA Người Đón", relationship: "Con", phoneNumber: "0911111111", idCardLast4: "1234" }));
await step("pickup add CCCD sai định dạng bị chặn", () => svc.pickup.addPickup(eid, { fullName: "X", phoneNumber: "0911111112", idCardLast4: "12a" }), true);
const p2 = await step("pickup add 2", () => svc.pickup.addPickup(eid, { fullName: "QA Người Đón 2", phoneNumber: "0911111113", idCardLast4: "5678" }));
if (d(p2)) await step("pickup update", () => svc.pickup.updatePickup(d(p2).pickupPersonId, { fullName: "QA Người Đón 2 (sửa)", phoneNumber: "0911111113", idCardLast4: "5678" }));
if (d(p2)) await step("pickup remove", () => svc.pickup.removePickup(d(p2).pickupPersonId));
await step("pickup cụ nhà khác bị chặn", () => svc.pickup.listPickup(1), true);
const absDay = plusWorking(2);
const ab = await step("báo vắng", () => svc.pickup.reportAbsence(eid, absDay, "QA đi khám"));
await step("báo vắng trùng ngày bị chặn", () => svc.pickup.reportAbsence(eid, absDay), true);
await step("báo vắng ngày đã qua bị chặn", () => svc.pickup.reportAbsence(eid, "2026-11-01"), true);
if (d(ab)) await step("hủy báo vắng", () => svc.pickup.cancelAbsence(d(ab).absenceId));
await step("báo vắng lại", () => svc.pickup.reportAbsence(eid, absDay, "QA đi khám"));
// đăng ký gói cho HÔM NAY để staff check-in được
const pk = d(await svc.billing.getActivePackages())[0];
const prof = d(await svc.elderly.getElderlyProfileById(eid));
const support = ["Support", "Cần hỗ trợ"].includes(prof.mobilityStatus);
const price = pk.pricePerDay + (/cơ bản/i.test(pk.packageName) && support ? 75000 : 0);
await step("đăng ký gói hôm nay", () => svc.billing.registerPackage({ packageId: pk.packageId, elderlyId: eid, registrationType: "daily", startDate: TODAY, endDate: TODAY, roomType: "large", totalDays: 1, packagePrice: price, supportSurcharge: 0, roomSurcharge: 0, totalAmount: price, selectedDates: [TODAY], paymentMethod: "QA" }));
const conv = await step("mở cuộc trò chuyện", () => svc.msg.start(eid));
const cid = d(conv)?.conversationId;
if (cid) await step("gia đình gửi tin", () => svc.msg.send(cid, "QA: hôm nay cụ ăn uống thế nào?"));
await step("gửi tin rỗng bị chặn", () => svc.msg.send(cid, "   "), true);

// ── Staff ──
await login("Staff", acc.qaStaff);
await step("staff overview", () => svc.overview.staffOverview());
await step("my schedule", () => svc.req.mySchedule(14));
const col = await step("colleagues", () => svc.req.colleagues());
const leave = await step("gửi đơn nghỉ", () => svc.req.create({ requestType: "Leave", requestDate: plusWorking(3), reason: "QA nghỉ" }));
await step("đơn trùng ngày bị chặn", () => svc.req.create({ requestType: "Leave", requestDate: plusWorking(3) }), true);
const swapWith = d(col)?.[0]?.userId;
const sc = await step("gửi đơn đổi ca", () => svc.req.create({ requestType: "ShiftChange", requestDate: plusWorking(4), swapWithStaffId: swapWith, reason: "QA đổi ca" }));
await step("check-in cụ QA", () => svc.att.checkIn(eid));
await step("check-out sai CCCD bị chặn", async () => { const p = await svc.att.getPickupPersons(eid); return svc.att.checkOut(eid, { pickupPersonId: p[0].pickupPersonId, idCardLast4: "0000" }); }, true);
await step("check-out đúng người đón", async () => { const p = await svc.att.getPickupPersons(eid); return svc.att.checkOut(eid, { pickupPersonId: p[0].pickupPersonId, idCardLast4: "1234" }); });
await step("staff messages list", () => svc.msg.conversations());

// ── Manager: duyệt đơn, tin nhắn, báo vắng, vật tư sự cố ──
await login("Manager", acc.qaManager);
if (d(leave)) await step("duyệt đơn nghỉ", () => svc.req.review(d(leave).requestId, true, "QA ok"));
if (d(sc)) await step("từ chối đơn đổi ca", () => svc.req.review(d(sc).requestId, false, "QA không đủ người"));
await step("lịch NV sau duyệt = Leave", async () => { const r = await svc.api.get(`/api/center/staff/${acc.qaStaffId}/schedules`); const s = r.data.data.find((x) => x.workDate === plusWorking(3)); return { success: s && !s.isWorking, message: JSON.stringify(s) }; });
await step("báo vắng theo ngày", async () => { const r = (await svc.api.get("/api/center/absences", { params: { date: absDay } })).data; return { success: r.data.some((x) => x.elderlyId === eid) }; });
const mconv = await step("manager thấy cuộc trò chuyện", async () => { const r = await svc.msg.conversations(); return { success: r.data.some((c) => c.conversationId === cid), data: r.data }; });
if (cid) {
  await step("manager đọc tin", () => svc.msg.messages(cid));
  await step("manager trả lời", () => svc.msg.send(cid, "QA: cụ ăn hết suất, khỏe."));
}
const supply = await step("vật tư có đơn giá", () => svc.sup.create({ supplyName: `QA Gạc v2 ${Date.now() % 100000}`, unit: "miếng", minimumStock: 2, quantityInStock: 6, unitPrice: 3000, expiryDate: "2027-01-31" }));
const inc = await step("tạo sự cố", () => svc.inc.create({ elderlyId: eid, incidentType: "QA trầy tay", severity: "Low", description: "QA v2" }));
if (d(inc) && d(supply)) {
  await step("ghi vật tư sự cố", () => svc.inc.recordSupplies(d(inc).incidentId, [{ supplyId: d(supply).supplyId, quantity: 2 }]));
  await step("phí sự cố = 6000", async () => { const r = await svc.inc.get(d(inc).incidentId); return { success: r.data.supplyChargeAmount === 6000, message: String(r.data.supplyChargeAmount) }; });
  await step("vượt tồn bị chặn", () => svc.inc.recordSupplies(d(inc).incidentId, [{ supplyId: d(supply).supplyId, quantity: 99 }]), true);
  await step("cập nhật chuyển viện", () => svc.inc.update(d(inc).incidentId, { incidentType: "QA trầy tay", severity: "Low", description: "QA v2", hospitalName: "BV QA", handlingActions: "Sát trùng" }));
}

// ── Family nhận thông báo & trả lời ──
await login("Family", acc.qaFamily);
await step("family nhận thông báo đến/về + vật tư + tin nhắn", async () => {
  const r = await svc.notif.getMine(false, 50);
  const types = new Set(r.data.items.map((n) => n.notificationType));
  const need = ["Attendance", "IncidentSupply", "Message"];
  return { success: need.every((t) => types.has(t)), message: [...types].join(",") };
});
if (cid) await step("family thấy trả lời", async () => { const r = await svc.msg.messages(cid); return { success: r.data.length >= 2, message: `${r.data.length} tin` }; });
await step("family overview có người đón", async () => { const r = await svc.overview.familyOverview(); const m = r.data.members.find((x) => x.elderlyId === eid); return { success: m?.pickupName?.includes("QA Người Đón"), message: JSON.stringify({ s: m?.status, p: m?.pickupName }) }; });

fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
const sum = results.reduce((a, r) => ((a[r.status.startsWith("HTTP") ? "HTTP4xx" : r.status] = (a[r.status.startsWith("HTTP") ? "HTTP4xx" : r.status] ?? 0) + 1), a), {});
console.log(JSON.stringify(sum));
for (const r of results) if (r.status !== "PASS") console.log(`[${r.role}] ${r.status} ${r.name} :: ${r.msg}`);
await vite.close();
process.exit(0);
