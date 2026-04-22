import { launchContext, humanScroll, sleep } from "../browser.js";
import { randomUUID } from "node:crypto";

type Params = any;

function buildFotocasaUrl(p: Params): string {
  const op = p.operation === "compra" ? "comprar" : "alquiler";
  const city = (p.city || "madrid-capital").toLowerCase().replace(/\s+/g, "-");
  const qs = new URLSearchParams();
  if (p.priceMin) qs.set("priceMin", String(p.priceMin));
  if (p.priceMax) qs.set("priceMax", String(p.priceMax));
  if (p.surfaceMin) qs.set("surfaceMin", String(p.surfaceMin));
  if (p.surfaceMax) qs.set("surfaceMax", String(p.surfaceMax));
  if (p.roomsMin) qs.set("roomsMin", String(p.roomsMin));
  return `https://www.fotocasa.es/es/${op}/viviendas/${city}/todas-las-zonas/l?${qs.toString()}`;
}

export async function searchFotocasa(params: Params, onBatch: (batch: any[]) => Promise<void>) {
  const session = randomUUID().slice(0, 8);
  const { browser, page } = await launchContext(session);
  try {
    await page.goto(buildFotocasaUrl(params), { waitUntil: "domcontentloaded", timeout: 45_000 });

    await page
      .locator('button:has-text("Aceptar")')
      .first()
      .click({ timeout: 5000 })
      .catch(() => {});

    const blocked = await page
      .locator('text=/un momento/i, iframe[src*="captcha"]')
      .first()
      .isVisible()
      .catch(() => false);
    if (blocked) throw new Error("captcha_blocked");

    for (let pageNum = 1; pageNum <= 5; pageNum++) {
      await humanScroll(page);
      await sleep(800, 2000);

      const items = await page.locator('[data-testid="re-CardPackPremium"], article.re-CardPackBasic').evaluateAll((cards) =>
        cards.map((c: any) => {
          const link = c.querySelector("a") as HTMLAnchorElement | null;
          const price = c.querySelector('[data-testid="re-CardPrice"], .re-CardPrice')?.textContent ?? "";
          return {
            external_id: link?.href?.split("/").filter(Boolean).pop(),
            url: link?.href,
            title: c.querySelector('[data-testid="re-CardTitle"], .re-CardTitle')?.textContent?.trim(),
            price: parseInt(price.replace(/[^\d]/g, ""), 10) || null,
          };
        })
      );

      const cleaned = items.filter((i: any) => i.external_id && i.url);
      if (cleaned.length) await onBatch(cleaned);

      const next = page.locator('a[aria-label="Siguiente"], .sui-Pagination-next a').first();
      const hasNext = await next.isVisible().catch(() => false);
      if (!hasNext) break;
      await Promise.all([page.waitForLoadState("domcontentloaded"), next.click()]);
      await sleep(8000, 14000);
    }
  } finally {
    await browser.close();
  }
}
