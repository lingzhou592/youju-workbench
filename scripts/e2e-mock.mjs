import { launchBrowser } from "./browser.mjs";

const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
});
page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));

await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.getByRole("button", { name: /下一步：选择事实依据/ }).click();
await page.waitForSelector(".fact-card");
await page.getByRole("button", { name: /下一步：生成文案/ }).click();
await page.waitForSelector(".generate-empty-panel");
await page.getByRole("button", { name: /生成两版标题候选/ }).click();
await page.waitForSelector(".candidate-card", { timeout: 30000 });
await page.waitForTimeout(800);
await page.screenshot({ path: "docs/screenshots/mock-01-generate.png", fullPage: true });
console.log("generated candidates:", await page.locator(".candidate-card").count());

await page.getByRole("button", { name: /进入校验与修订/ }).first().click();
await page.waitForSelector(".review-rail");
await page.locator(".rail-tabs button").filter({ hasText: "模型建议" }).click();
await page.getByRole("button", { name: /运行审核/ }).click();
await page.waitForSelector(".issue-card", { timeout: 30000 });
await page.waitForTimeout(4500);
await page.screenshot({ path: "docs/screenshots/mock-02-review.png", fullPage: true });
console.log("model issues:", await page.locator(".issue-card").count());

await page.locator(".issue-card input[type=checkbox]").first().check();
await page.locator(".revision-panel .rail-field textarea").fill(
  "按建议把开头改得更有动作感，保留全部引用，不要新增事实。",
);
await page.getByRole("button", { name: /开始定向修订/ }).click();
await page.waitForSelector(".diff-panel", { timeout: 30000 });
await page.waitForTimeout(4500);
await page.screenshot({ path: "docs/screenshots/mock-03-revision.png", fullPage: true });
console.log("diff panels:", await page.locator(".diff-panel").count());

await page.locator(".rail-tabs button").filter({ hasText: "人工确认" }).click();
const boxes = page.locator(".confirm-checklist input[type=checkbox]");
const count = await boxes.count();
for (let i = 0; i < count; i += 1) await boxes.nth(i).check();
await page.locator(".rail-body textarea").first().fill(
  "已核对价格、时间与报名方式；开头已按建议调整，引用仍然可定位。",
);
await page.getByRole("button", { name: /确认当前版本/ }).click();
await page.waitForSelector(".export-main", { timeout: 30000 });
await page.waitForTimeout(4500);
await page.screenshot({ path: "docs/screenshots/mock-04-export.png", fullPage: true });
console.log("export header:", await page.locator(".export-header").innerText());
console.log("errors:", JSON.stringify(errors, null, 2));

await browser.close();
