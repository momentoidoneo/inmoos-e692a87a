import { launchContext, humanScroll, sleep } from "../browser.js";
import { solveDataDome, captchaEnabled } from "../captcha.js";
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

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");
}

function buildIdealistaUrl(p: Params): string {
  // Tipo de inmueble afecta al segmento: venta-viviendas (general), venta-pisos, venta-casas…
  const typeMap: Record<string, string> = {
    piso: "pisos",
    casa: "casas",
    chalet: "casas",
    local: "locales",
    oficina: "oficinas",
    garaje: "garajes",
  };
  const segment = p.propertyTypes?.[0] ? typeMap[p.propertyTypes[0]] ?? "viviendas" : "viviendas";
  const op = p.operation === "compra" ? `venta-${segment}` : `alquiler-${segment}`;
  const city = slugify(p.city || "madrid");
  // Zona: idealista usa /barrio/ después de la ciudad (ej. madrid/chamberi/)
  const zone = p.zones?.[0] ? `${slugify(p.zones[0])}/` : "";

  const filters: string[] = [];
  if (p.priceMin) filters.push(`precio-desde_${p.priceMin}`);
  if (p.priceMax) filters.push(`precio-hasta_${p.priceMax}`);
  if (p.surfaceMin) filters.push(`metros-cuadrados-mas-de_${p.surfaceMin}`);
  if (p.surfaceMax) filters.push(`metros-cuadrados-menos-de_${p.surfaceMax}`);
  if (p.roomsMin) filters.push(`de-${p.roomsMin}-dormitorios`);
  if (p.listingType === "particular") filters.push("publicado-por_particular");
  if (p.listingType === "agencia") filters.push("publicado-por_agencias");
  const path = filters.length ? `/con-${filters.join(",")}/` : "/";
  return `https://www.idealista.com/${op}/${city}/${zone}${path.replace(/^\//, "")}`;
}

async function isBlocked(page: any): Promise<boolean> {
  return await page
    .locator(
      'iframe[src*="captcha-delivery"], iframe[src*="captcha"], #px-captcha, text=/acceso denegado/i, text=/access denied/i',
    )
    .first()
    .isVisible()
    .catch(() => false);
}

async function tryAcceptCookies(page: any) {
  const buttons = [
    'button:has-text("Aceptar")',
    'button:has-text("Aceptar y continuar")',
    '#didomi-notice-agree-button',
    'button[id*="accept"]',
  ];
  for (const sel of buttons) {
    const ok = await page
      .locator(sel)
      .first()
      .click({ timeout: 2500 })
      .then(() => true)
      .catch(() => false);
    if (ok) return;
  }
}

async function tryDataDomeSolve(page: any, pageUrl: string): Promise<boolean> {
  if (!captchaEnabled()) return false;
  // Buscar iframe del captcha
  const iframeSrc = await page
    .locator('iframe[src*="captcha-delivery"]')
    .first()
    .getAttribute("src")
    .catch(() => null);
  if (!iframeSrc) return false;
  const ua = await page.evaluate(() => navigator.userAgent);
  const cookie = await solveDataDome(iframeSrc, pageUrl, ua);
  if (!cookie) return false;
  // Inyectar cookie y recargar
  const url = new URL(pageUrl);
  await page.context().addCookies([
    {
      name: "datadome",
      value: cookie,
      domain: `.${url.hostname.replace(/^www\./, "")}`,
      path: "/",
      httpOnly: false,
      secure: true,
      sameSite: "Lax",
    },
  ]);
  await page.reload({ waitUntil: "domcontentloaded", timeout: 45_000 });
  return !(await isBlocked(page));
}

export async function searchIdealista(params: Params, onBatch: (batch: any[]) => Promise<void>) {
  const session = randomUUID().slice(0, 8);
  const { browser, page } = await launchContext(session);
  try {
    // 1) Warm-up: visitar home primero (parecer sesión humana)
    console.log("[idealista] warm-up home");
    await page.goto("https://www.idealista.com/", {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    await tryAcceptCookies(page);
    await sleep(1500, 3500);
    await humanScroll(page).catch(() => {});
    await sleep(1000, 2500);

    // 2) Navegar a búsqueda
    const url = buildIdealistaUrl(params);
    console.log("[idealista] goto", url);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await tryAcceptCookies(page);

    // 3) Detección + solver
    if (await isBlocked(page)) {
      console.warn("[idealista] blocked, attempting captcha solve");
      const ok = await tryDataDomeSolve(page, url);
      if (!ok) throw new Error("captcha_blocked");
      console.log("[idealista] captcha solved, continuing");
    }

    let pageNum = 1;
    while (pageNum <= 5) {
      await humanScroll(page);
      await sleep(800, 2200);

      // Selector con fallback (Idealista varía la marca)
      const items = await page
        .locator("article.item, article[data-element-id], div.item-info-container")
        .evaluateAll((cards: any[]) =>
          cards.map((c: any) => {
            const link =
              (c.querySelector("a.item-link") as HTMLAnchorElement | null) ??
              (c.querySelector("a[href*='/inmueble/']") as HTMLAnchorElement | null);
            const priceText =
              c.querySelector(".item-price")?.textContent ??
              c.querySelector("[class*='price']")?.textContent ??
              "";
            const detailsTexts = Array.from(c.querySelectorAll(".item-detail")).map(
              (d: any) => d.textContent?.trim() ?? "",
            );
            const externalId =
              c.getAttribute("data-element-id") ??
              c.getAttribute("data-adid") ??
              link?.href?.split("/").filter(Boolean).pop();
            return {
              external_id: externalId,
              url: link?.href,
              title: link?.textContent?.trim(),
              price: parseInt(priceText.replace(/[^\d]/g, ""), 10) || null,
              description:
                c.querySelector(".item-description")?.textContent?.trim() ?? null,
              raw: { detailsTexts },
            };
          }),
        );

      const cleaned = items.filter((i: any) => i.external_id && i.url);
      console.log(`[idealista] page=${pageNum} extracted=${cleaned.length}`);
      if (cleaned.length) await onBatch(cleaned);

      const next = page.locator('a.icon-arrow-right-after, li.next a').first();
      const hasNext = await next.isVisible().catch(() => false);
      if (!hasNext) break;
      await Promise.all([page.waitForLoadState("domcontentloaded"), next.click()]);
      pageNum++;
      await sleep(8000, 14000);

      if (await isBlocked(page)) {
        console.warn("[idealista] blocked mid-pagination, attempting solve");
        const ok = await tryDataDomeSolve(page, page.url());
        if (!ok) break;
      }
    }
  } finally {
    await browser.close();
  }
}
