import { chromium as playChromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import UserAgent from "user-agents";
import type { Browser, BrowserContext, Page } from "playwright";
import { getProxy } from "./proxy.js";

playChromium.use(StealthPlugin());

export async function launchContext(sessionId: string): Promise<{ browser: Browser; ctx: BrowserContext; page: Page }> {
  const proxy = getProxy(sessionId);

  const browser = (await playChromium.launch({
    headless: false, // ejecutado bajo xvfb en Docker
    proxy,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-dev-shm-usage",
    ],
  })) as unknown as Browser;

  const ua = new UserAgent({ deviceCategory: "desktop", platform: "Win32" }).toString();

  const ctx = await browser.newContext({
    userAgent: ua,
    locale: "es-ES",
    timezoneId: "Europe/Madrid",
    viewport: { width: 1366, height: 768 },
    deviceScaleFactor: 1,
    extraHTTPHeaders: {
      "Accept-Language": "es-ES,es;q=0.9,en;q=0.7",
    },
  });

  const page = await ctx.newPage();
  return { browser, ctx, page };
}

export async function humanScroll(page: Page) {
  const total = await page.evaluate(() => document.body.scrollHeight);
  let y = 0;
  while (y < total) {
    const step = 200 + Math.floor(Math.random() * 400);
    y += step;
    await page.mouse.wheel(0, step);
    await page.waitForTimeout(200 + Math.random() * 600);
  }
}

export const sleep = (min: number, max: number) =>
  new Promise((r) => setTimeout(r, min + Math.random() * (max - min)));
