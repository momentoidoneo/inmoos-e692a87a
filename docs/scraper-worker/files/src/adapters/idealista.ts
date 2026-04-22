import { launchContext, humanScroll, sleep } from "../browser.js";
import { randomUUID } from "node:crypto";

type Params = {
  operation: "compra" | "alquiler" | "alquiler_temporal";
  city: string;
  zones?: string[];
  priceMin?: number;
  priceMax?: number;
  surfaceMin?: number;
  surfaceMax?: number;
  roomsMin?: number;
  propertyTypes?: string[];
  listingType?: "particular" | "agencia" | "ambos";
};

function buildIdealistaUrl(p: Params): string {
  const op = p.operation === "compra" ? "venta-viviendas" : "alquiler-viviendas";
  const slug = (p.city || "madrid").toLowerCase();
  const filters: string[] = [];
  if (p.priceMin) filters.push(`precio-desde_${p.priceMin}`);
  if (p.priceMax) filters.push(`precio-hasta_${p.priceMax}`);
  if (p.surfaceMin) filters.push(`metros-cuadrados-mas-de_${p.surfaceMin}`);
  if (p.surfaceMax) filters.push(`metros-cuadrados-menos-de_${p.surfaceMax}`);
  if (p.roomsMin) filters.push(`de-${p.roomsMin}-dormitorios`);
  if (p.listingType === "particular") filters.push("publicado-por_particular");
  if (p.listingType === "agencia") filters.push("publicado-por_agencias");
  const path = filters.length ? `/con-${filters.join(",")}/` : "/";
  return `https://www.idealista.com/${op}/${slug}${path}`;
}

export async function searchIdealista(params: Params, onBatch: (batch: any[]) => Promise<void>) {
  const session = randomUUID().slice(0, 8);
  const { browser, page } = await launchContext(session);
  try {
    const url = buildIdealistaUrl(params);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });

    // Cookies banner
    await page
      .locator('button:has-text("Aceptar")')
      .first()
      .click({ timeout: 5000 })
      .catch(() => {});

    // Detección de captcha / bloqueo
    const blocked = await page
      .locator('iframe[src*="captcha"], #px-captcha, text=/acceso denegado/i')
      .first()
      .isVisible()
      .catch(() => false);
    if (blocked) throw new Error("captcha_blocked");

    let pageNum = 1;
    while (pageNum <= 5) {
      await humanScroll(page);
      await sleep(800, 2200);

      const items = await page
        .locator("article.item")
        .evaluateAll((cards) =>
          cards.map((c: any) => {
            const link = c.querySelector("a.item-link") as HTMLAnchorElement | null;
            const priceText = c.querySelector(".item-price")?.textContent ?? "";
            const detailsTexts = Array.from(c.querySelectorAll(".item-detail")).map((d: any) => d.textContent?.trim() ?? "");
            return {
              external_id: c.getAttribute("data-element-id") ?? c.getAttribute("data-adid") ?? link?.href?.split("/").filter(Boolean).pop(),
              url: link?.href,
              title: c.querySelector(".item-link")?.textContent?.trim(),
              price: parseInt(priceText.replace(/[^\d]/g, ""), 10) || null,
              description: c.querySelector(".item-description")?.textContent?.trim() ?? null,
              raw: { detailsTexts },
            };
          })
        );

      const cleaned = items.filter((i: any) => i.external_id && i.url);
      if (cleaned.length) await onBatch(cleaned);

      // siguiente página
      const next = page.locator('a.icon-arrow-right-after, li.next a').first();
      const hasNext = await next.isVisible().catch(() => false);
      if (!hasNext) break;
      await Promise.all([
        page.waitForLoadState("domcontentloaded"),
        next.click(),
      ]);
      pageNum++;
      await sleep(8000, 14000); // rate limit por dominio
    }
  } finally {
    await browser.close();
  }
}
