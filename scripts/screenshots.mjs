import fs from "node:fs";
import { launchBrowser } from "./browser.mjs";

fs.mkdirSync("docs/screenshots/mock", { recursive: true });

const STICKY_OFF = `
  .sidebar { position: relative !important; height: auto !important; min-height: 100vh; overflow: visible !important; }
  .stepper { position: static !important; }
  .step-aside, .review-aside, .sources-aside, .aside-sticky { position: static !important; }
  .review-rail { max-height: none !important; overflow: visible !important; }
  .review-rail .rail-body { max-height: none !important; overflow: visible !important; }
`;

const browser = await launchBrowser();

async function prepare(page) {
  await page.addStyleTag({ content: STICKY_OFF });
}

const sample = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await sample.newPage();
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await prepare(page);
await page.screenshot({ path: "docs/screenshots/01-brief.png", fullPage: true });

await page.getByRole("button", { name: /下一步：选择事实依据/ }).click();
await page.waitForSelector(".fact-card");
await prepare(page);
await page.screenshot({ path: "docs/screenshots/02-evidence.png", fullPage: true });

await page.getByRole("button", { name: /下一步：生成文案/ }).click();
await page.waitForSelector(".generate-empty-panel");
await prepare(page);
await page.screenshot({ path: "docs/screenshots/03-generate-preflight.png", fullPage: true });

await page.getByRole("button", { name: /加载内置示例运行/ }).click();
await page.waitForSelector(".review-rail");
await page.waitForTimeout(4500);
await prepare(page);
await page.screenshot({ path: "docs/screenshots/04-sample-review.png", fullPage: true });

await page.getByRole("button", { name: /去导出（草稿）/ }).click();
await page.waitForSelector(".export-main");
await page.waitForTimeout(500);
await prepare(page);
await page.screenshot({ path: "docs/screenshots/05-sample-export.png", fullPage: true });

await page.goto("http://localhost:3000/sources", { waitUntil: "networkidle" });
await page.waitForSelector(".brand-editor-panel");
await prepare(page);
await page.screenshot({ path: "docs/screenshots/06-brand-editor.png", fullPage: true });
await page.locator(".fact-library-panel").scrollIntoViewIfNeeded();
await page.waitForTimeout(200);
await page.screenshot({ path: "docs/screenshots/07-fact-library.png" });

await page.goto("http://localhost:3000/history", { waitUntil: "networkidle" });
await page.waitForSelector(".history-content");
await prepare(page);
await page.screenshot({ path: "docs/screenshots/08-history-runs.png", fullPage: true });

await page.locator(".history-tabs button").filter({ hasText: "测试用例" }).click();
await page.waitForTimeout(200);
await prepare(page);
await page.screenshot({ path: "docs/screenshots/09-test-cases.png", fullPage: true });

await page.locator(".history-tabs button").filter({ hasText: "规则演示" }).click();
await page.waitForTimeout(200);
await prepare(page);
await page.screenshot({ path: "docs/screenshots/10-rule-sandbox.png", fullPage: true });

const mock = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const mockPage = await mock.newPage();
await mockPage.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await mockPage.getByRole("button", { name: /下一步：选择事实依据/ }).click();
await mockPage.waitForSelector(".fact-card");
await mockPage.getByRole("button", { name: /下一步：生成文案/ }).click();
await mockPage.waitForSelector(".generate-empty-panel");
await mockPage.getByRole("button", { name: /生成两版标题候选/ }).click();
await mockPage.waitForSelector(".candidate-card", { timeout: 30000 });
await mockPage.waitForTimeout(1500);
await prepare(mockPage);
await mockPage.screenshot({ path: "docs/screenshots/mock/01-generate.png", fullPage: true });

await mockPage.getByRole("button", { name: /进入校验与修订/ }).first().click();
await mockPage.waitForSelector(".review-rail");
await mockPage.locator(".rail-tabs button").filter({ hasText: "模型建议" }).click();
await mockPage.getByRole("button", { name: /运行审核/ }).click();
await mockPage.waitForSelector(".issue-card", { timeout: 30000 });
await mockPage.waitForTimeout(4500);
await prepare(mockPage);
await mockPage.screenshot({ path: "docs/screenshots/mock/02-review.png", fullPage: true });

await mockPage.locator(".issue-card input[type=checkbox]").first().check();
await mockPage.locator(".revision-panel .rail-field textarea").fill(
  "按建议把开头改得更有动作感，保留全部引用，不要新增事实。",
);
await mockPage.getByRole("button", { name: /开始定向修订/ }).click();
await mockPage.waitForSelector(".diff-panel", { timeout: 30000 });
await mockPage.waitForTimeout(4500);
await prepare(mockPage);
await mockPage.screenshot({ path: "docs/screenshots/mock/03-revision.png", fullPage: true });

await mockPage.locator(".rail-tabs button").filter({ hasText: "人工确认" }).click();
const boxes = mockPage.locator(".confirm-checklist input[type=checkbox]");
for (let i = 0; i < (await boxes.count()); i += 1) await boxes.nth(i).check();
await mockPage.locator(".rail-body textarea").first().fill(
  "已核对价格、时间与报名方式；开头已按建议调整，引用仍然可定位。",
);
await mockPage.getByRole("button", { name: /确认当前版本/ }).click();
await mockPage.waitForSelector(".export-main", { timeout: 30000 });
await mockPage.waitForTimeout(4500);
await prepare(mockPage);
await mockPage.screenshot({ path: "docs/screenshots/mock/04-export.png", fullPage: true });

const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mobilePage = await mobile.newPage();
await mobilePage.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await mobilePage.screenshot({ path: "docs/screenshots/11-mobile.png", fullPage: true });

console.log("screenshots done");
await browser.close();
