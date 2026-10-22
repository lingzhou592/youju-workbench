import fs from "node:fs";
import { chromium } from "playwright";

const CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);

export async function launchBrowser() {
  const executablePath = CANDIDATES.find((candidate) => fs.existsSync(candidate));
  return chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });
}
