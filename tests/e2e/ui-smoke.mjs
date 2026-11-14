// UI smoke: đăng nhập từng role, click mọi tab sidebar + tab con, ghi lỗi console / JS / request >= 400.
import { chromium } from "playwright-core";
import fs from "node:fs";

const [ACCOUNTS_JSON, OUT_DIR] = process.argv.slice(2);
const acc = JSON.parse(fs.readFileSync(ACCOUNTS_JSON, "utf8")).accounts;
const FE = process.env.FE_URL ?? "http://localhost:5174";
const BE = process.env.BE_URL ?? "http://localhost:5075";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const roles = [
  { name: "Admin", email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD, paths: ["/dashboard/admin", "/dashboard/center"] },
  { name: "Staff", ...acc.qaStaff, paths: ["/dashboard/staff"] },
  { name: "Family", ...acc.qaFamily, paths: ["/dashboard/family"] },
  ...(acc.qaManager ? [{ name: "Manager", ...acc.qaManager, paths: ["/dashboard/center"] }] : []),
];

const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH ?? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });
const report = [];

for (const r of roles) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 820 }, colorScheme: "light" });
  let where = "";
  page.on("console", (m) => m.type() === "error" && !/Failed to load resource/.test(m.text()) && report.push({ role: r.name, where, kind: "console", text: m.text().slice(0, 300) }));
  page.on("pageerror", (e) => report.push({ role: r.name, where, kind: "pageerror", text: e.message.slice(0, 300) }));
  page.on("response", async (res) => {
    if (!res.url().startsWith(BE) || res.status() < 400) return;
    let body = "";
    try { body = (await res.text()).slice(0, 200); } catch {}
    report.push({ role: r.name, where, kind: `HTTP ${res.status()}`, text: `${res.request().method()} ${res.url().replace(BE, "")} ${body}` });
  });

  await page.goto(FE);
  await page.evaluate(async ({ be, email, password }) => {
    const x = await fetch(`${be}/api/Auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) }).then((y) => y.json());
    localStorage.setItem("auth_token", x.data.token);
    localStorage.setItem("auth_user", JSON.stringify(x.data.user));
  }, { be: BE, email: r.email, password: r.password });

  for (const path of r.paths) {
    where = path;
    await page.goto(FE + path);
    await sleep(2000);
    const labels = await page.locator("aside nav button, aside button").evaluateAll((els) =>
      els.map((e) => e.innerText.trim()).filter((t) => t && !/Đăng Xuất|Về Trang Chủ/i.test(t)));
    for (const label of [...new Set(labels)]) {
      where = `${path} › ${label.split("\n")[0]}`;
      await page.locator("aside button", { hasText: label.split("\n")[0] }).first().click().catch(() => {});
      await sleep(1800);
      // tab con (shadcn Tabs / role=tab) trong vùng nội dung
      const subTabs = await page.locator("main [role='tab']").count();
      for (let i = 0; i < subTabs; i++) {
        const t = page.locator("main [role='tab']").nth(i);
        const name = (await t.innerText().catch(() => "")).trim();
        where = `${path} › ${label.split("\n")[0]} › ${name}`;
        await t.click().catch(() => {});
        await sleep(1000);
      }
      const safe = `${r.name}-${label.split("\n")[0]}`.replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 60);
      await page.screenshot({ path: `${OUT_DIR}/${safe}.png` });
      report.push({ role: r.name, where: `${path} › ${label.split("\n")[0]}`, kind: "VISITED", text: "" });
    }
  }
  await page.close();
}
await browser.close();
fs.writeFileSync(`${OUT_DIR}/ui-report.json`, JSON.stringify(report, null, 2));
const issues = report.filter((x) => x.kind !== "VISITED");
console.log(`visited=${report.length - issues.length} issues=${issues.length}`);
for (const x of issues) console.log(`[${x.role}] ${x.kind} @ ${x.where} :: ${x.text}`);
