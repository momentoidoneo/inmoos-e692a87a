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
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-");
}

function buildFotocasaUrl(p: Params): string {
  const op = p.operation === "alquiler" || p.operation === "alquiler_temporal" ? "alquiler" : "comprar";
  // Fotocasa usa "viviendas" para todo, "pisos" para piso, "casas" para casa…
  const typeMap: Record<string, string> = {
    piso: "pisos",
    casa: "casas",
    chalet: "casas",
    local: "locales",
    oficina: "oficinas",
    garaje: "garajes",
  };
  const type = p.propertyTypes?.[0] ? typeMap[p.propertyTypes[0]] ?? "viviendas" : "viviendas";
  const city = p.city ? slug(p.city) : "madrid-capital";
  const zonePart = p.zones?.[0] ? slug(p.zones[0]) : "todas-las-zonas";

  const qs = new URLSearchParams();
  if (p.priceMin) qs.set("priceMin", String(p.priceMin));
  if (p.priceMax) qs.set("priceMax", String(p.priceMax));
  if (p.surfaceMin) qs.set("surfaceMin", String(p.surfaceMin));
  if (p.surfaceMax) qs.set("surfaceMax", String(p.surfaceMax));
  if (p.roomsMin) qs.set("roomsMin", String(p.roomsMin));
  // Fotocasa: clientTypeId=2 particular, =1 profesional
  if (p.listingType === "particular") qs.set("clientTypeId", "2");
  if (p.listingType === "agencia") qs.set("clientTypeId", "1");

  const query = qs.toString();
  return `https://www.fotocasa.es/es/${op}/${type}/${city}/${zonePart}/l${query ? `?${query}` : ""}`;
}

export async function searchFotocasa(params: Params, onBatch: (batch: any[]) => Promise<void>) {
  const session = randomUUID().slice(0, 8);
  const { browser, page } = await launchContext(session);
  try {
    const url = buildFotocasaUrl(params);
    console.log("[fotocasa] goto", url);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });

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

    const listingType = params.listingType ?? null;

    for (let pageNum = 1; pageNum <= 5; pageNum++) {
      await humanScroll(page);
      await sleep(800, 2000);

      const items = await page
        .locator('[data-testid="re-CardPackPremium"], article.re-CardPackBasic, article[data-testid*="Card"]')
        .evaluateAll((cards: any[], lt: string | null) =>
          cards.map((c: any) => {
            const link = c.querySelector("a") as HTMLAnchorElement | null;
            const priceText =
              c.querySelector('[data-testid="re-CardPrice"], .re-CardPrice, [class*="price"]')
                ?.textContent ?? "";
            const advertiser =
              c.querySelector('[data-testid*="advertiser"], [class*="advertiser"], [class*="client"]')
                ?.textContent?.toLowerCase() ?? "";
            const detectedType = /particular/.test(advertiser)
              ? "particular"
              : advertiser
                ? "agencia"
                : null;
            return {
              external_id: link?.href?.split("/").filter(Boolean).pop(),
              url: link?.href,
              title: c
                .querySelector('[data-testid="re-CardTitle"], .re-CardTitle, h2, h3')
                ?.textContent?.trim(),
              price: parseInt(priceText.replace(/[^\d]/g, ""), 10) || null,
              listing_type: detectedType ?? lt,
            };
          }),
        listingType);

      const filtered = items.filter((i: any) => {
        if (!i.external_id || !i.url) return false;
        if (listingType && listingType !== "ambos" && i.listing_type && i.listing_type !== listingType) {
          return false;
        }
        return true;
      });

      console.log(`[fotocasa] page=${pageNum} extracted=${filtered.length}`);
      if (filtered.length) await onBatch(filtered);

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
