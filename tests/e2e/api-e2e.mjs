// E2E contract test: gọi BE bằng CHÍNH các service FE (src/services/*.ts) qua Vite SSR loader.
// Chạy: node api-e2e.mjs <FE_ROOT> <OUT_JSON>
import { pathToFileURL } from "node:url";
import fs from "node:fs";
import crypto from "node:crypto";

const [FE_ROOT, OUT] = process.argv.slice(2);
const { createServer } = await import(pathToFileURL(`${FE_ROOT}/node_modules/vite/dist/node/index.js`).href);

// ── shim môi trường trình duyệt cho api.ts ──
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
globalThis.window = { dispatchEvent() {}, addEventListener() {}, removeEventListener() {} };

const vite = await createServer({ root: FE_ROOT, logLevel: "error", server: { middlewareMode: true, hmr: false }, appType: "custom" });
const load = async (p) => (await vite.ssrLoadModule(p)).default ?? (await vite.ssrLoadModule(p));
const svc = {
  auth: (await vite.ssrLoadModule("/src/services/authService.ts")).authService,
  adminUser: await load("/src/services/adminUserService.ts"),
  attendance: await load("/src/services/attendanceService.ts"),
  billing: (await vite.ssrLoadModule("/src/services/billingApiService.ts")).billingApiService,
  careLog: await load("/src/services/careLogService.ts"),
  centerStaff: await load("/src/services/centerStaffService.ts"),
  planning: await load("/src/services/dailyPlanningService.ts"),
  elderly: await load("/src/services/elderlyService.ts"),
  familyCareLog: await load("/src/services/familyCareLogService.ts"),
  staffAssign: await load("/src/services/staffAssignmentService.ts"),
  notification: await load("/src/services/notificationService.ts"),
  medication: await load("/src/services/medicationService.ts"),
  incident: await load("/src/services/incidentReportService.ts"),
  supply: await load("/src/services/medicalSupplyService.ts"),
  api: await load("/src/services/api.ts"),
};

// ── runner ──
const results = [];
let role = "";
const asRole = (r, token) => {
  role = r;
  if (token) localStorage.setItem("auth_token", token);
};
async function step(name, fn) {
  const t0 = Date.now();
  try {
    const res = await fn();
    const ok = !(res && typeof res === "object" && "success" in res && res.success === false);
    results.push({ role, name, status: ok ? "PASS" : "FAIL(success=false)", http: 200, msg: ok ? "" : res.message, ms: Date.now() - t0 });
    return res;
  } catch (e) {
    const http = e?.response?.status ?? 0;
    const body = e?.response?.data;
    const msg = (body && (body.message || body.title || JSON.stringify(body.errors ?? body))) || e.message;
    results.push({ role, name, status: http >= 500 || http === 0 ? "ERROR" : `HTTP ${http}`, http, msg: String(msg).slice(0, 300), ms: Date.now() - t0 });
    return undefined;
  }
}
const d = (r) => r?.data;
const TODAY = process.env.TODAY ?? new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const pad = (n) => String(n).padStart(2, "0");
const now = new Date();
const inMinutes = (m) => { const x = new Date(Date.now() + m * 60000); return `${pad(x.getHours())}:${pad(x.getMinutes())}`; };
const addDays = (iso, n) => { const x = new Date(iso + "T00:00:00"); x.setDate(x.getDate() + n); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; };
const nextWeekday = (iso) => { let x = addDays(iso, 1); while (new Date(x + "T00:00:00").getDay() === 0) x = addDays(x, 1); return x; };
const pw = () => "Qa@" + crypto.randomBytes(5).toString("hex") + "9x";
const stamp = Date.now().toString(36);

// ═════════ ADMIN / CENTER ═════════
const adminLogin = await step("auth.login (admin)", () => svc.auth.login({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }));
asRole("Admin", d(adminLogin)?.token);
await step("auth.getCurrentUser", () => svc.auth.getCurrentUser());

// Admin users CRUD trên user tạm
await step("adminUser.getUsers", () => svc.adminUser.getUsers({ pageNumber: 1, pageSize: 10 }));
await step("adminUser.getRoles", () => svc.adminUser.getRoles());
const tmpUser = await step("adminUser.createUser", () =>
  svc.adminUser.createUser({ email: `qa.tmp.${stamp}@test.local`, password: pw(), fullName: "QA Tạm", phoneNumber: "0900000001", isActive: true, roles: ["FamilyMember"] }));
const tmpId = d(tmpUser)?.userId;
if (tmpId) {
  await step("adminUser.getUserById", () => svc.adminUser.getUserById(tmpId));
  await step("adminUser.updateUser", () => svc.adminUser.updateUser(tmpId, { fullName: "QA Tạm (sửa)", phoneNumber: "0900000002", isActive: true, roles: ["FamilyMember"] }));
  await step("adminUser.toggleStatus", () => svc.adminUser.toggleStatus(tmpId));
  await step("adminUser.deleteUser", () => svc.adminUser.deleteUser(tmpId));
}

// Center staff + tạo QA staff (luồng "Thêm nhân viên")
await step("centerStaff.getStaffList", () => svc.centerStaff.getStaffList({ pageNumber: 1, pageSize: 20 }));
const qaStaffCred = { email: `qa.staff.${stamp}@test.local`, password: pw() };
const qaStaff = await step("centerStaff.createStaff (QA staff)", () =>
  svc.centerStaff.createStaff({ fullName: "QA Nhân Viên", email: qaStaffCred.email, phoneNumber: "0900000003", temporaryPassword: qaStaffCred.password }));
const qaStaffId = d(qaStaff)?.userId;
if (qaStaffId) {
  await step("centerStaff.checkDeactivation", () => svc.centerStaff.checkDeactivation(qaStaffId));
  const futureDay = nextWeekday(addDays(TODAY, 3));
  const sch = await step("centerStaff.setSchedule", () => svc.centerStaff.setSchedule(qaStaffId, { workDate: futureDay, isWorking: false, note: "QA nghỉ" }));
  await step("centerStaff.setSchedule (upsert same day)", () => svc.centerStaff.setSchedule(qaStaffId, { workDate: futureDay, isWorking: true, note: "QA đi làm" }));
  await step("centerStaff.getSchedules", () => svc.centerStaff.getSchedules(qaStaffId));
  if (d(sch)?.scheduleId) await step("centerStaff.deleteSchedule", () => svc.centerStaff.deleteSchedule(qaStaffId, d(sch).scheduleId));
}
await step("center elderly list (api.get)", () => svc.api.get("/api/center/elderly").then((r) => r.data));

// Daily planning: chạy đủ 5 bước cho ngày làm việc kế tiếp (luồng wizard), rồi gán QA staff vào nhóm của HÔM NAY
const allGroups = (g) => [...(d(g)?.normalGroups ?? []), ...(d(g)?.supportGroups ?? [])];
async function runPlanning(date, tag) {
  const plan = await step(`planning.getOrInitPlan(${tag})`, () => svc.planning.getOrInitPlan(date));
  const pid = d(plan)?.planId;
  if (!pid) return null;
  const att = await step(`planning.getAttendanceForecast(${tag})`, () => svc.planning.getAttendanceForecast(pid));
  const items = d(att)?.items ?? [];
  if (items.length) {
    await step(`planning.updateAttendance(${tag})`, () => svc.planning.updateAttendance(pid, items[0].elderlyId, "Expected"));
    await step(`planning.bulkUpdateAttendance(${tag})`, () => svc.planning.bulkUpdateAttendance(pid, items.map((e) => ({ elderlyId: e.elderlyId, attendanceStatus: "Expected" }))));
  }
  let gr = await step(`planning.getGroupArrangement(${tag})`, () => svc.planning.getGroupArrangement(pid));
  const created = await step(`planning.createCareGroup(${tag})`, () => svc.planning.createCareGroup(pid, `QA nhóm ${stamp}`, "Normal"));
  const qaGroup = allGroups(created).find((g) => g.groupName === `QA nhóm ${stamp}`);
  const withMember = allGroups(created).find((g) => g.members?.length);
  if (qaGroup && withMember) {
    const m = withMember.members[0].elderlyId;
    await step(`planning.moveElderlyToGroup → QA group(${tag})`, () => svc.planning.moveElderlyToGroup(pid, m, qaGroup.groupId));
    await step(`planning.moveElderlyToGroup ← back(${tag})`, () => svc.planning.moveElderlyToGroup(pid, m, withMember.groupId));
  }
  if (qaGroup) await step(`planning.deleteCareGroup(${tag})`, () => svc.planning.deleteCareGroup(pid, qaGroup.groupId));
  await step(`planning.getStaffAvailability(${tag})`, () => svc.planning.getStaffAvailability(date));
  if (qaStaffId) {
    await step(`planning.updateStaffAvailability(${tag})`, () => svc.planning.updateStaffAvailability(date, qaStaffId, "Working"));
    await step(`planning.bulkUpdateStaffAvailability(${tag})`, () => svc.planning.bulkUpdateStaffAvailability(date, [{ staffId: qaStaffId, availability: "Working" }]));
  }
  await step(`planning.generateAssignment(${tag})`, () => svc.planning.generateAssignment(pid));
  gr = await step(`planning.getGroupArrangement after generate(${tag})`, () => svc.planning.getGroupArrangement(pid));
  const g0 = allGroups(gr)[0];
  if (g0 && qaStaffId) await step(`planning.assignStaffToGroup QA(${tag})`, () => svc.planning.assignStaffToGroup(pid, g0.groupId, qaStaffId));
  await step(`planning.getPlanSummary(${tag})`, () => svc.planning.getPlanSummary(pid));
  await step(`planning.publishPlan(${tag})`, () => svc.planning.publishPlan(pid));
  return pid;
}
const planId = await runPlanning(nextWeekday(TODAY), "next day");
// Hôm nay: kế hoạch có thể đã publish → thử gán QA staff (kiểm tra luồng gán sau khi publish)
const todayPlan = await step("planning.getOrInitPlan(today)", () => svc.planning.getOrInitPlan(TODAY));
const tg = await step("planning.getGroupArrangement(today)", () => svc.planning.getGroupArrangement(d(todayPlan)?.planId));
const tg0 = allGroups(tg)[0];
if (tg0 && qaStaffId) await step("planning.assignStaffToGroup QA(today, published)", () => svc.planning.assignStaffToGroup(d(todayPlan).planId, tg0.groupId, qaStaffId));

await step("planning.getPlanHistory", () => svc.planning.getPlanHistory());

// Staff assignment (API cũ)
await step("staffAssign.getSchedulePlan(today)", () => svc.staffAssign.getSchedulePlan(TODAY));

// Incident reports CRUD
const inc = await step("incident.create", () =>
  svc.incident.create({ elderlyId: 1, incidentType: "QA té ngã", severity: "Low", description: "QA test tạo sự cố", occurredAt: `${TODAY}T08:15` }));
const incId = d(inc)?.incidentId;
await step("incident.list (filters)", () => svc.incident.list({ pageNumber: 1, pageSize: 10, status: "Open", severity: "Low", search: "QA" }));
if (incId) {
  await step("incident.get", () => svc.incident.get(incId));
  await step("incident.update", () => svc.incident.update(incId, { incidentType: "QA té ngã (sửa)", severity: "Medium", description: "QA sửa mô tả", occurredAt: `${TODAY}T08:20` }));
  await step("incident.updateStatus InProgress", () => svc.incident.updateStatus(incId, "InProgress", "QA đang xử lý"));
  await step("incident.updateStatus Resolved", () => svc.incident.updateStatus(incId, "Resolved", "QA đã xử lý"));
  await step("incident.confirmSupply true", () => svc.incident.confirmSupply(incId, true, "QA"));
  await step("incident.confirmSupply false", () => svc.incident.confirmSupply(incId, false));
  await step("incident.remove", () => svc.incident.remove(incId));
}

// Medical supplies
const sup = await step("supply.create", () => svc.supply.create({ supplyName: `QA Gạc ${stamp}`, unit: "hộp", minimumStock: 5, quantityInStock: 3 }));
const supId = d(sup)?.supplyId;
await step("supply.list (lowStock)", () => svc.supply.list({ pageNumber: 1, pageSize: 10, isLowStock: true, isActive: true }));
if (supId) {
  await step("supply.get", () => svc.supply.get(supId));
  await step("supply.update", () => svc.supply.update(supId, { supplyName: `QA Gạc ${stamp} (sửa)`, unit: "hộp", minimumStock: 4 }));
  await step("supply.adjustStock +10", () => svc.supply.adjustStock(supId, 10, "QA nhập"));
  await step("supply.adjustStock -2.5", () => svc.supply.adjustStock(supId, -2.5, "QA xuất"));
  await step("supply.toggleStatus off", () => svc.supply.toggleStatus(supId));
  await step("supply.toggleStatus on", () => svc.supply.toggleStatus(supId));
}

// Notifications (admin)
await step("notification.getMine", () => svc.notification.getMine(false, 30));
await step("notification.markAllRead", () => svc.notification.markAllRead());

// Attendance (center view)
await step("attendance.getByDate(today)", () => svc.attendance.getByDate(TODAY));
await step("attendance.getPresentToday", () => svc.attendance.getPresentToday());
await step("attendance.getHistory(1)", () => svc.attendance.getHistory(1));

// ═════════ STAFF (QA staff) ═════════
let staffElderly = [];
if (qaStaffId) {
  const sl = await step("auth.login (QA staff)", () => svc.auth.login(qaStaffCred));
  asRole("Staff", d(sl)?.token);
  await step("staffAssign.getMyCareGroup", () => svc.staffAssign.getMyCareGroup(TODAY));
  staffElderly = (await step("careLog.getTodayElderly", () => svc.careLog.getTodayElderly())) ?? [];
  results.push({ role, name: `INFO staff elderly today = ${staffElderly.map((e) => e.elderlyId).join(",") || "(none)"}`, status: "INFO", msg: "" });
  const eid = staffElderly[0]?.elderlyId ?? 1;
  await step("attendance.checkIn", () => svc.attendance.checkIn(eid));
  await step("attendance.getPresentToday (staff)", () => svc.attendance.getPresentToday());
  await step("careLog.getDay", () => svc.careLog.getDay(eid, TODAY));
  const entry = await step("careLog.addEntry MEAL", () =>
    svc.careLog.addEntry(eid, { careType: "MEAL", description: "QA ăn trưa", notes: "Ăn hết", data: { portion: "full" }, isInternal: false }));
  await step("careLog.addEntry NOTE internal", () => svc.careLog.addEntry(eid, { careType: "NOTE", description: "QA ghi chú nội bộ", isInternal: true }));
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
  if (entry?.careLogId) {
    const photos = await step("careLog.uploadPhotos", () => svc.careLog.uploadPhotos(entry.careLogId, [new File([png], "qa.png", { type: "image/png" })]));
    const pid = Array.isArray(photos) ? photos[0]?.photoId : undefined;
    if (pid) await step("careLog.deletePhoto", () => svc.careLog.deletePhoto(pid));
  }
  await step("careLog.recordVitals (normal, BP+glucose)", () =>
    svc.careLog.recordVitals(eid, { systolicBp: 125, diastolicBp: 80, heartRate: 76, spO2: 97, temperature: 36.7, bloodGlucose: 6.1, notes: "QA" }));
  await step("careLog.recordVitals (alert)", () => svc.careLog.recordVitals(eid, { systolicBp: 185, diastolicBp: 115, spO2: 89 }));

  // Medication (Staff)
  const mp = await step("medication.createPlan", () =>
    svc.medication.createPlan(eid, { medicationName: `QA Paracetamol ${stamp}`, dosage: "1 viên 500mg", instructions: "Sau ăn", scheduleTimes: [inMinutes(2), "20:00"], startDate: TODAY, endDate: addDays(TODAY, 6), isActive: true, generateDays: 7 }));
  await step("medication.getPlans", () => svc.medication.getPlans(eid));
  const mpId = d(mp)?.medicationPlanId;
  if (mpId) {
    await step("medication.generateDoses", () => svc.medication.generateDoses(mpId, { scheduleTimes: [inMinutes(2), "20:00"], from: TODAY, to: addDays(TODAY, 6) }));
    await step("medication.updatePlan (times changed)", () =>
      svc.medication.updatePlan(mpId, { medicationName: `QA Paracetamol ${stamp}`, dosage: "1 viên", startDate: TODAY, endDate: addDays(TODAY, 6), isActive: true, scheduleTimes: [inMinutes(2), "21:00"] }));
    // REGRESSION: sau khi đổi giờ, kế hoạch chỉ còn đúng giờ mới (không còn 20:00)
    await step("REGRESSION medication times after update = new times only", async () => {
      const plans = await svc.medication.getPlans(eid);
      const p = plans.data.find((x) => x.medicationPlanId === mpId);
      const ok = !p.scheduleTimes.includes("20:00") && p.scheduleTimes.includes("21:00");
      return { success: ok, message: "scheduleTimes=" + p.scheduleTimes.join(",") + " pending=" + p.pendingDoseCount };
    });
    // REGRESSION: tạm dừng → không còn liều chờ tương lai
    await step("medication.updatePlan (deactivate)", () =>
      svc.medication.updatePlan(mpId, { medicationName: `QA Paracetamol ${stamp}`, dosage: "1 viên", startDate: TODAY, endDate: addDays(TODAY, 6), isActive: false }));
    await step("REGRESSION medication deactivated has no pending doses", async () => {
      const plans = await svc.medication.getPlans(eid);
      const p = plans.data.find((x) => x.medicationPlanId === mpId);
      return { success: p.pendingDoseCount === 0 && !p.isActive, message: "pending=" + p.pendingDoseCount + " active=" + p.isActive };
    });
  }
  const doses = (await step("careLog.getTodayDoses", () => svc.careLog.getTodayDoses())) ?? [];
  const pending = doses.find((x) => x.status === "Pending" && !String(x.medicationName).startsWith("QA Paracetamol"));
  if (pending) await step("careLog.updateDose Given", () => svc.careLog.updateDose(pending.medicationRecordId, "Given", "QA đã cho uống"));

  const sinc = await step("careLog.createIncident (staff)", () => svc.careLog.createIncident({ elderlyId: eid, incidentType: "FALL", severity: "Low", description: "QA staff báo sự cố" }));
  await step("careLog.getIncidents", () => svc.careLog.getIncidents(undefined, 30));
  if (sinc?.incidentId) await step("careLog.updateIncident Resolved", () => svc.careLog.updateIncident(sinc.incidentId, "Resolved", "QA xong"));
  await step("incident-reports list (staff role)", () => svc.incident.list({ pageNumber: 1, pageSize: 5 }));
  await step("supply.list (staff role)", () => svc.supply.list({ pageNumber: 1, pageSize: 5 }));
  await step("attendance.checkOut", () => svc.attendance.checkOut(eid));
  await step("notification.getMine (staff)", () => svc.notification.getMine(false, 30));
  // đổi mật khẩu rồi đổi lại
  const newPw = pw();
  const cp = await step("auth.changePassword (staff)", () => svc.auth.changePassword({ currentPassword: qaStaffCred.password, newPassword: newPw, confirmNewPassword: newPw }));
  if (cp?.success) {
    await step("auth.changePassword (revert)", () => svc.auth.changePassword({ currentPassword: newPw, newPassword: qaStaffCred.password, confirmNewPassword: qaStaffCred.password }));
  }
}

// ═════════ FAMILY (QA family tự đăng ký) ═════════
const qaFamCred = { email: `qa.family.${stamp}@test.local`, password: pw() };
asRole("Family", null);
localStorage.removeItem("auth_token");
const reg = await step("auth.register (QA family)", () =>
  svc.auth.register({ fullName: "QA Gia Đình", email: qaFamCred.email, phoneNumber: "0900000004", password: qaFamCred.password, confirmPassword: qaFamCred.password }));
const fl = await step("auth.login (QA family)", () => svc.auth.login(qaFamCred));
asRole("Family", d(fl)?.token ?? d(reg)?.token);
const elderlyDto = (name) => ({
  fullName: name, dateOfBirth: "1945-03-12", gender: "Female", relationship: "Mẹ", emergencyContactName: "QA Con", emergencyContactPhone: "0900000005",
  address: "1 QA, Q1, HCM", allergies: "Penicillin", medicalHistory: "Cao huyết áp", medicalNotes: "", mobilityStatus: "Normal", careNotes: "QA",
});
const el = await step("elderly.createElderlyProfile", () => svc.elderly.createElderlyProfile(elderlyDto("QA Cụ Bà")));
const famElderlyId = d(el)?.elderlyId;
await step("elderly.getMyElderlyProfiles", () => svc.elderly.getMyElderlyProfiles());
if (famElderlyId) {
  await step("elderly.getElderlyProfileById", () => svc.elderly.getElderlyProfileById(famElderlyId));
  await step("elderly.updateElderlyProfile", () => svc.elderly.updateElderlyProfile(famElderlyId, { ...elderlyDto("QA Cụ Bà (sửa)"), mobilityStatus: "Support" }));
}
const el2 = await step("elderly.create (to delete)", () => svc.elderly.createElderlyProfile(elderlyDto("QA Xóa")));
if (d(el2)?.elderlyId) await step("elderly.deleteElderlyProfile", () => svc.elderly.deleteElderlyProfile(d(el2).elderlyId));

const pk = await step("billing.getActivePackages", () => svc.billing.getActivePackages());
const pkg = d(pk)?.[0];
if (pkg && famElderlyId) {
  const days = [nextWeekday(TODAY), nextWeekday(nextWeekday(TODAY))];
  const price = pkg.pricePerDay * days.length + (/cơ bản/i.test(pkg.packageName) ? 75000 * days.length : 0); // cụ đã đổi sang Support ở bước update
  const r = await step("billing.registerPackage", () =>
    svc.billing.registerPackage({
      packageId: pkg.packageId, elderlyId: String(famElderlyId), registrationType: "daily", startDate: days[0], endDate: days[1], roomType: "large",
      totalDays: days.length, packagePrice: price, supportSurcharge: 0, roomSurcharge: 0, totalAmount: price, selectedDates: days, paymentMethod: "Chuyển khoản QR (VietQR / VNPay)",
    }));
  const inv = await step("billing.getInvoices", () => svc.billing.getInvoices());
  const invNo = d(r)?.invoiceNo ?? d(inv)?.[0]?.invoiceNo;
  if (invNo) await step("billing.getInvoiceDetail", () => svc.billing.getInvoiceDetail(invNo));
}
const famEid = famElderlyId ?? 1;
await step("familyCareLog.getDay", () => svc.familyCareLog.getDay(famEid, TODAY));
await step("familyCareLog.getTimeline", () => svc.familyCareLog.getTimeline(famEid, 7));
await step("familyCareLog.getHistory", () => svc.familyCareLog.getHistory(famEid, addDays(TODAY, -7), TODAY));
await step("familyCareLog.getHealth", () => svc.familyCareLog.getHealth(famEid, 30));
await step("familyCareLog.getIncidents", () => svc.familyCareLog.getIncidents(30));
await step("attendance.getHistory (family own)", () => svc.attendance.getHistory(famEid));
await step("notification.getMine (family)", () => svc.notification.getMine(false, 30));
// quyền: family KHÔNG được xem cụ của người khác
await step("SECURITY familyCareLog.getDay(other family's elderly 1) should be 403/404", () => svc.familyCareLog.getDay(1, TODAY));

// ═════════ ĐỢT 1 — kiểm tra hồi quy ═════════
const expectFail = (name, fn, wantHttp) => step(name, async () => {
  try {
    const r = await fn();
    if (r && r.success === false) return { success: !wantHttp, message: "BE từ chối (success=false): " + r.message };
    return { success: false, message: "KHÔNG bị chặn" };
  } catch (e) {
    const http = e?.response?.status;
    return { success: wantHttp ? http === wantHttp : http >= 400 && http < 500, message: `HTTP ${http}: ${e?.response?.data?.message}` };
  }
});
// 1.1 Family không được check-in
asRole("Family", d(fl)?.token);
await expectFail("DOT1 1.1 family check-in bị chặn 403", () => svc.attendance.checkIn(famEid), 403);
// 1.6 Family xem cụ nhà khác → 403
await expectFail("DOT1 1.6 family xem cụ nhà khác → 403", () => svc.familyCareLog.getDay(1, TODAY), 403);
await expectFail("DOT1 1.6 family health cụ nhà khác → 403", () => svc.familyCareLog.getHealth(1, 30), 403);
// 1.2 BR-83 đăng ký cho cụ không thuộc nhà mình
const pkList = d(await svc.billing.getActivePackages()) ?? [];
const p0 = pkList[0];
const days2 = [nextWeekday(TODAY), nextWeekday(nextWeekday(TODAY))];
const baseReq = (eid, total) => ({ packageId: p0.packageId, elderlyId: String(eid), registrationType: "daily", startDate: days2[0], endDate: days2[1], roomType: "large",
  totalDays: 2, packagePrice: total, supportSurcharge: 0, roomSurcharge: 0, totalAmount: total, selectedDates: days2, paymentMethod: "QA" });
await expectFail("DOT1 1.2 đăng ký cho cụ nhà khác bị chặn", () => svc.billing.registerPackage(baseReq(1, p0.pricePerDay * 2)));
// 1.2 tổng tiền sai (client gửi 1.000đ) bị chặn
await expectFail("DOT1 1.2 tổng tiền do client sửa bị chặn", () => svc.billing.registerPackage(baseReq(famEid, 1000)));
// 1.2 tổng đúng theo công thức server → thành công
const isBasic = /cơ bản/i.test(p0.packageName);
const famProfile = d(await svc.elderly.getElderlyProfileById(famEid));
const needSupport = ["Support", "Cần hỗ trợ"].includes(famProfile?.mobilityStatus);
const correct = p0.pricePerDay * 2 + (isBasic && needSupport ? 75000 * 2 : 0);
await step(`DOT1 1.2 tổng đúng (${correct}) được chấp nhận`, () => svc.billing.registerPackage(baseReq(famEid, correct)));
// 1.7 Manager (role Center) xem điểm danh nhưng không check-in
asRole("Admin", d(adminLogin)?.token);
const mgrCred = { email: `qa.manager.${stamp}@test.local`, password: pw() };
await step("DOT1 tạo QA manager (role Center)", () => svc.adminUser.createUser({ ...mgrCred, fullName: "QA Quản Lý", phoneNumber: "0900000006", isActive: true, roles: ["Center"] }));
const ml = await step("auth.login (QA manager)", () => svc.auth.login(mgrCred));
asRole("Manager", d(ml)?.token);
await step("DOT1 1.7 manager xem điểm danh theo ngày", () => svc.attendance.getByDate(TODAY).then((x) => ({ success: Array.isArray(x), message: `${x.length} bản ghi` })));
await step("DOT1 1.7 manager xem lịch sử 1 cụ", () => svc.attendance.getHistory(1).then((x) => ({ success: Array.isArray(x), message: `${x.length} bản ghi` })));
await expectFail("DOT1 1.7 manager không được check-in", () => svc.attendance.checkIn(1), 403);
// 1.4 Staff cũ (đã bị gán lại) không thấy / không ghi được cụ 1
if (process.env.PREV) {
  const prev = JSON.parse(fs.readFileSync(process.env.PREV, "utf8")).accounts.qaStaff;
  const pl = await step("auth.login (QA staff cũ, không còn được phân)", () => svc.auth.login(prev));
  asRole("StaffOld", d(pl)?.token);
  await step("DOT1 1.4 staff không được phân → danh sách hôm nay rỗng", () => svc.careLog.getTodayElderly().then((x) => ({ success: x.length === 0, message: `${x.length} cụ` })));
  await expectFail("DOT1 1.4 staff không được phân → không ghi được", () => svc.careLog.addEntry(1, { careType: "NOTE", description: "QA không được phân", isInternal: false }));
}
// 1.5 Chốt ngày (staff đang được phân, cụ đầu tiên)
if (qaStaffId) {
  const sl2 = await svc.auth.login(qaStaffCred);
  asRole("Staff", d(sl2)?.token);
  const eid = (await svc.careLog.getTodayElderly())[0]?.elderlyId;
  if (eid) {
    await expectFail("DOT1 1.5 chốt khi chưa xác nhận y tế bị chặn", () => svc.careLog.closeDay(eid));
    for (const dose of (await svc.careLog.getTodayDoses()).filter((x) => x.elderlyId === eid && x.status === "Pending" && new Date(x.scheduledAt) <= new Date())) {
      await step(`DOT1 ghi liều tới giờ #${dose.medicationRecordId}`, () => svc.careLog.updateDose(dose.medicationRecordId, "Given", "QA"));
    }
    await step("DOT1 1.5 xác nhận y tế xong", () => svc.careLog.markMedicalDone(eid).then((x) => ({ success: !!x, message: x?.careType })));
    await step("DOT1 1.5 chốt care log", () => svc.careLog.closeDay(eid).then((x) => ({ success: !!x, message: x?.careType })));
    await expectFail("DOT1 1.5 sau khi chốt không ghi thêm được", () => svc.careLog.addEntry(eid, { careType: "NOTE", description: "QA sau chốt", isInternal: false }));
    await step("DOT1 1.5 danh sách hiện isClosed", () => svc.careLog.getTodayElderly().then((x) => { const e = x.find((y) => y.elderlyId === eid); return { success: !!e?.isClosed && !!e?.isMedicalDone, message: JSON.stringify({ md: e?.isMedicalDone, closed: e?.isClosed }) }; }));
  }
}
results.at(-1);

fs.writeFileSync(OUT, JSON.stringify({ results, accounts: { qaStaff: qaStaffCred, qaFamily: qaFamCred, qaManager: typeof mgrCred !== "undefined" ? mgrCred : null, qaStaffId, planId, famElderlyId } }, null, 2));
const summary = results.reduce((a, r) => ((a[r.status.startsWith("HTTP") ? "HTTP4xx" : r.status] = (a[r.status.startsWith("HTTP") ? "HTTP4xx" : r.status] ?? 0) + 1), a), {});
console.log(JSON.stringify(summary));
for (const r of results) if (r.status !== "PASS") console.log(`[${r.role}] ${r.status} ${r.name} :: ${r.msg}`);
await vite.close();
process.exit(0);
