import { launchContext, humanScroll, sleep } from "../browser.js";
import { randomUUID } from "node:crypto";

type Params = any;

function buildHabitacliaUrl(p: Params): string {
  const op = p.operation === "compra" ? "comprar" : "alquiler";
  const city = (p.city || "barcelona").toLowerCase().replace(/\s+/g, "-");
  return `https://www.habitaclia.com/${op}-vivienda-en-${city}.htm`;
}

export async function searchHabitaclia(params: Params, onBatch: (batch: any[]) => Promise<void>) {
  const session = randomUUID().slice(0, 8);
  const { browser, page } = await launchContext(session);
  try {
    await page.goto(buildHabitacliaUrl(params), { waitUntil: "domcontentloaded", timeout: 45_000 });

    await page
      .locator('button:has-text("Aceptar")')
      .first()
      .click({ timeout: 5000 })
      .catch(() => {});

    for (let pageNum = 1; pageNum <= 5; pageNum++) {
      await humanScroll(page);
      await sleep(800, 2000);

      const items = await page.locator("article.list-item-info, article.list-item").evaluateAll((cards) =>
        cards.map((c: any) => {
          const link = c.querySelector("a") as HTMLAnchorElement | null;
          const price = c.querySelector(".list-item-price, .price")?.textContent ?? "";
          return {
            external_id: link?.href?.split("/").filter(Boolean).pop(),
            url: link?.href,
            title: c.querySelector("h3, .list-item-title")?.textContent?.trim(),
            price: parseInt(price.replace(/[^\d]/g, ""), 10) || null,
          };
        })
      );

      const cleaned = items.filter((i: any) => i.external_id && i.url);
      if (cleaned.length) await onBatch(cleaned);

      const next = page.locator('a.next, a[rel="next"]').first();
      const hasNext = await next.isVisible().catch(() => false);
      if (!hasNext) break;
      await Promise.all([page.waitForLoadState("domcontentloaded"), next.click()]);
      await sleep(8000, 14000);
    }
  } finally {
    await browser.close();
  }
}
