import { launchBrowser } from "./browser.mjs";

const STICKY_OFF = `
  .sidebar { position: relative !important; height: auto !important; min-height: 100vh; overflow: visible !important; }
  .stepper { position: static !important; }
  .step-aside, .review-aside, .sources-aside, .aside-sticky, .comparison-aside { position: static !important; }
`;

const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
});
page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));

await page.goto("http://localhost:3000/history", { waitUntil: "domcontentloaded" });
await page.waitForSelector(".history-content");
await page.locator(".history-tabs button").filter({ hasText: "对照评测" }).click();
await page.waitForTimeout(300);
await page.getByRole("button", { name: /运行这条对照/ }).click();
await page.waitForSelector(".comparison-side", { timeout: 60000 });
await page.waitForTimeout(4500);
console.log("metrics:", await page.locator(".comparison-grid").innerText());

const pickers = page.locator(".score-picker");
for (let i = 0; i < (await pickers.count()); i += 1) {
  await pickers.nth(i).locator("button").nth(3).click();
}
await page.locator(".comparison-note textarea").fill(
  "工作台版本的事实与引用更可核对；直接版本更自然，但没有引用，且必提信息覆盖不稳定。",
);
await page.getByRole("button", { name: /保存人工评分/ }).click();
await page.waitForTimeout(500);
await page.addStyleTag({ content: STICKY_OFF });
await page.screenshot({ path: "docs/screenshots/mock/05-comparison.png", fullPage: true });
console.log("saved records:", await page.locator(".evaluation-record").count());
console.log("errors:", JSON.stringify(errors, null, 2));
await browser.close();
