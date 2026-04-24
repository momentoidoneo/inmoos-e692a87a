import { launchContext, humanScroll, sleep } from "../browser.js";
import { randomUUID } from "node:crypto";

type Params = {
  operation?: "compra" | "alquiler" | "alquiler_temporal";
  city?: string;
  zones?: string[];
  priceMin?: number;
  priceMax?: number;
  surfaceMin?: number;
  surfaceMax?: number;
  roomsMin?: number;
  propertyTypes?: string[];
  listingType?: "particular" | "agencia" | "ambos";
};

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function buildHabitacliaUrl(p: Params): string {
  const op = p.operation === "alquiler" || p.operation === "alquiler_temporal" ? "alquiler" : "comprar";
  // tipo: piso, casa, local, etc. (por defecto vivienda = todos)
  const type = p.propertyTypes?.[0] ? slug(p.propertyTypes[0]) : "vivienda";
  const city = p.city ? slug(p.city) : "barcelona";
  // zona como sufijo: -en-{zona}
  const zone = p.zones?.[0] ? `-en-${slug(p.zones[0])}` : "";

  // Filtros via query string
  const qs = new URLSearchParams();
  if (p.priceMin) qs.set("preuMin", String(p.priceMin));
  if (p.priceMax) qs.set("preuMax", String(p.priceMax));
  if (p.surfaceMin) qs.set("supMin", String(p.surfaceMin));
  if (p.surfaceMax) qs.set("supMax", String(p.surfaceMax));
  if (p.roomsMin) qs.set("habMin", String(p.roomsMin));
  // Habitaclia: anunciante particular = "promoter=2", agencia = "promoter=1"
  if (p.listingType === "particular") qs.set("promoter", "2");
  if (p.listingType === "agencia") qs.set("promoter", "1");

  const query = qs.toString();
  return `https://www.habitaclia.com/${op}-${type}-en-${city}${zone}.htm${query ? `?${query}` : ""}`;
}

export async function searchHabitaclia(params: Params, onBatch: (batch: any[]) => Promise<void>) {
  const session = randomUUID().slice(0, 8);
  const { browser, page } = await launchContext(session);
  try {
    const url = buildHabitacliaUrl(params);
    console.log("[habitaclia] goto", url);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });

    await page
      .locator('button:has-text("Aceptar")')
      .first()
      .click({ timeout: 5000 })
      .catch(() => {});

    for (let pageNum = 1; pageNum <= 5; pageNum++) {
      await humanScroll(page);
      await sleep(800, 2000);

      const listingType = params.listingType ?? null;
      const items = await page
        .locator("article.list-item-info, article.list-item")
        .evaluateAll((cards: any[], lt: string | null) =>
          cards.map((c: any) => {
            const link = c.querySelector("a") as HTMLAnchorElement | null;
            const price = c.querySelector(".list-item-price, .price")?.textContent ?? "";
            // Intentar detectar si es particular o agencia desde el card
            const advertiserText =
              c.querySelector(".list-item-advertiser, .advertiser, .professional-name")
                ?.textContent?.toLowerCase() ?? "";
            const detectedType = /particular/.test(advertiserText)
              ? "particular"
              : advertiserText
                ? "agencia"
                : null;
            return {
              external_id: link?.href?.split("/").filter(Boolean).pop(),
              url: link?.href,
              title: c.querySelector("h3, .list-item-title")?.textContent?.trim(),
              price: parseInt(price.replace(/[^\d]/g, ""), 10) || null,
              listing_type: detectedType ?? lt,
            };
          }),
        listingType);

      // Filtro adicional client-side por si el filtro server no aplicó
      const filtered = items.filter((i: any) => {
        if (!i.external_id || !i.url) return false;
        if (listingType && listingType !== "ambos" && i.listing_type && i.listing_type !== listingType) {
          return false;
        }
        return true;
      });

      console.log(`[habitaclia] page=${pageNum} extracted=${filtered.length}`);
      if (filtered.length) await onBatch(filtered);

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
