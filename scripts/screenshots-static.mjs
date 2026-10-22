import { launchBrowser } from "./browser.mjs";

const STICKY_OFF = `
  .sidebar { position: relative !important; height: auto !important; min-height: 100vh; overflow: visible !important; }
  .stepper { position: static !important; }
  .step-aside, .review-aside, .sources-aside, .aside-sticky, .comparison-aside { position: static !important; }
  .review-rail { max-height: none !important; overflow: visible !important; }
  .review-rail .rail-body { max-height: none !important; overflow: visible !important; }
`;

const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const style = async () => page.addStyleTag({ content: STICKY_OFF });

await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
await page.waitForSelector(".step-grid");
await style();
await page.screenshot({ path: "docs/screenshots/01-brief.png", fullPage: true });

await page.getByRole("button", { name: /下一步：选择事实依据/ }).click();
await page.waitForSelector(".fact-card");
await style();
await page.screenshot({ path: "docs/screenshots/02-evidence.png", fullPage: true });

await page.getByRole("button", { name: /下一步：生成文案/ }).click();
await page.waitForSelector(".generate-empty-panel");
await style();
await page.screenshot({ path: "docs/screenshots/03-generate-preflight.png", fullPage: true });

await page.getByRole("button", { name: /加载内置示例运行/ }).click();
await page.waitForSelector(".review-rail");
await page.waitForTimeout(4500);
await style();
await page.screenshot({ path: "docs/screenshots/04-sample-review.png", fullPage: true });

await page.getByRole("button", { name: /去导出（草稿）/ }).click();
await page.waitForSelector(".export-main");
await page.waitForTimeout(500);
await style();
await page.screenshot({ path: "docs/screenshots/05-sample-export.png", fullPage: true });

await page.goto("http://localhost:3000/sources", { waitUntil: "domcontentloaded" });
await page.waitForSelector(".brand-editor-panel");
await style();
await page.screenshot({ path: "docs/screenshots/06-brand-editor.png", fullPage: true });
await page.locator(".fact-library-panel").scrollIntoViewIfNeeded();
await page.waitForTimeout(200);
await page.screenshot({ path: "docs/screenshots/07-fact-library.png" });

await page.goto("http://localhost:3000/history", { waitUntil: "domcontentloaded" });
await page.waitForSelector(".history-content");
await style();
await page.screenshot({ path: "docs/screenshots/08-history-runs.png", fullPage: true });

await page.locator(".history-tabs button").filter({ hasText: "测试用例" }).click();
await page.waitForTimeout(200);
await style();
await page.screenshot({ path: "docs/screenshots/09-test-cases.png", fullPage: true });

await page.locator(".history-tabs button").filter({ hasText: "对照评测" }).click();
await page.waitForTimeout(300);
await style();
await page.screenshot({ path: "docs/screenshots/12-comparison-empty.png", fullPage: true });

await page.locator(".history-tabs button").filter({ hasText: "规则演示" }).click();
await page.waitForTimeout(200);
await style();
await page.screenshot({ path: "docs/screenshots/10-rule-sandbox.png", fullPage: true });

const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mobilePage = await mobile.newPage();
await mobilePage.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
await mobilePage.waitForSelector(".step-grid");
await mobilePage.screenshot({ path: "docs/screenshots/11-mobile.png", fullPage: true });

console.log("static screenshots done");
await browser.close();
