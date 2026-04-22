# Worker externo del scraper de portales (InmoOS)

> Este documento describe cómo construir el worker que ejecuta las búsquedas en
> portales inmobiliarios para alimentar el módulo `Oportunidades` de InmoOS.
>
> **El worker NO puede vivir en Lovable ni en Supabase Edge Functions** porque las
> IPs de datacenter son bloqueadas inmediatamente por las defensas anti-bot
> (DataDome / PerimeterX / Cloudflare) y porque no se ejecuta un navegador real.

---

## 1. Stack recomendado

- **Node 20 LTS** (o Bun)
- **Playwright** + [`playwright-extra`](https://github.com/berstend/puppeteer-extra) + [`puppeteer-extra-plugin-stealth`](https://github.com/berstend/puppeteer-extra/tree/master/packages/puppeteer-extra-plugin-stealth)
- **BullMQ** + **Redis** para la cola
- **Proveedor de proxies residenciales rotatorios**: Bright Data, Smartproxy, Oxylabs o IPRoyal
- **Postgres client** (`pg`) o llamadas a la Edge Function `scraper-ingest-results`

---

## 2. Variables de entorno

```env
SUPABASE_URL=https://wcnhjqfshcxqqauvxjhs.supabase.co
SUPABASE_SERVICE_ROLE_KEY=…   # solo si conectas directo a Postgres / RPC
WORKER_TOKEN=<shared-secret>   # mismo valor en el secret del proyecto Lovable
PROXY_USER=…
PROXY_PASS=…
PROXY_HOST=…   # ej. brd.superproxy.io:22225
REDIS_URL=redis://…
```

En **Lovable Cloud**, define los secrets:
- `WORKER_WEBHOOK_URL` — URL pública de tu worker (ej. `https://scraper.tudominio.com/jobs`)
- `WORKER_TOKEN` — el mismo `<shared-secret>` para validar las llamadas de ingesta

Cuando `WORKER_WEBHOOK_URL` está definido, `scraper-create-job` enrutará los trabajos a tu worker
en lugar de al `scraper-mock-worker` interno.

---

## 3. Contrato

### 3.1. Recepción de un job

Tu worker debe exponer un endpoint POST que reciba:

```json
POST /jobs
Headers: { "X-Worker-Token": "<shared-secret>" }
Body:
{
  "jobId": "uuid",
  "params": {
    "operation": "compra | alquiler | alquiler_temporal",
    "propertyTypes": ["piso", "casa", ...],
    "city": "Madrid",
    "zones": ["Salamanca", "Chamberí"],
    "priceMin": 100000, "priceMax": 500000,
    "surfaceMin": 60, "surfaceMax": 150,
    "roomsMin": 2, "bathroomsMin": 1,
    "listingType": "particular | agencia | ambos",
    "features": ["ascensor", "terraza", ...],
    "adAge": "24h | 7d | 30d | any"
  },
  "portals": ["idealista", "fotocasa", "habitaclia"]
}
```

Responde inmediatamente `{ "ok": true }` y procesa de forma asíncrona.

### 3.2. Envío de resultados

Llama a la Edge Function `scraper-ingest-results` (preferido) o inserta directo a Postgres.

```http
POST https://wcnhjqfshcxqqauvxjhs.supabase.co/functions/v1/scraper-ingest-results
Headers:
  X-Worker-Token: <shared-secret>
  Content-Type: application/json

Body:
{
  "jobId": "uuid",
  "results": [
    {
      "portal": "idealista",
      "external_id": "12345678",
      "url": "https://www.idealista.com/inmueble/12345678/",
      "title": "Piso reformado en Salamanca",
      "price": 450000,
      "surface_m2": 95,
      "rooms": 3,
      "bathrooms": 2,
      "property_type": "piso",
      "operation": "compra",
      "address": "Calle Velázquez 50",
      "zone": "Salamanca",
      "city": "Madrid",
      "lat": 40.42, "lng": -3.69,
      "listing_type": "particular",
      "images": ["https://..."],
      "description": "...",
      "published_at": "2026-04-22T10:00:00Z",
      "raw": { "...": "..." }
    }
  ],
  "progress": { "idealista": { "status": "running", "count": 12 } },
  "status": "running"
}
```

Al terminar el job:

```json
{ "jobId": "uuid", "status": "done" }
```

En caso de error: `{ "jobId": "uuid", "status": "error", "error": "captcha_blocked" }`.

---

## 4. Esqueleto de adapter por portal

```ts
// adapters/idealista.ts
import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
chromium.use(StealthPlugin());

export async function searchIdealista(params: SearchParams, proxy: ProxyConfig) {
  const browser = await chromium.launch({
    proxy: { server: `http://${proxy.host}`, username: proxy.user, password: proxy.pass },
    headless: false, // OJO: para máxima evasión, ejecutar con xvfb
  });
  const ctx = await browser.newContext({
    userAgent: pickRealisticUA(),
    locale: "es-ES",
    timezoneId: "Europe/Madrid",
    viewport: { width: 1366, height: 768 },
  });
  const page = await ctx.newPage();

  // Construir URL de búsqueda según params
  const url = buildIdealistaUrl(params);
  await page.goto(url, { waitUntil: "domcontentloaded" });

  // Aceptar cookies si aparece
  await page.locator('button:has-text("Aceptar")').click({ timeout: 5000 }).catch(() => {});

  // Movimientos de ratón humanos + scroll con easing
  await humanScroll(page);

  // Extraer cards
  const items = await page.$$eval("article.item", (cards) =>
    cards.map((c) => ({
      external_id: c.dataset.adid,
      title: c.querySelector(".item-title")?.textContent?.trim(),
      price: parseInt((c.querySelector(".item-price")?.textContent ?? "0").replace(/\D/g, "")),
      // ...
    }))
  );

  await browser.close();
  return items.map(normalize);
}
```

---

## 5. Recomendaciones operativas

- **Concurrencia**: 2–4 jobs simultáneos por instancia.
- **Rate limit**: ≤1 request cada 8 segundos por proxy por dominio.
- **Cuotas por tenant**: ≤30 jobs/hora (configurable).
- **Cache** por hash de query 6–24h.
- **Persistencia de sesión** entre jobs del mismo proxy para parecer un usuario que vuelve.
- **Backoff exponencial** ante 403/429 (1m → 5m → 30m → swap proxy).
- **Detección de CAPTCHA**: cambia proxy y rota fingerprint.
- **Respeto de robots.txt** y términos legales: el cliente debe asumir el riesgo.

---

## 6. Modo demo (sin worker)

Si no se define `WORKER_WEBHOOK_URL`, el sistema usa `scraper-mock-worker` (Edge Function)
que genera 8–18 resultados sintéticos por portal, insertados con delays para simular streaming.
Útil para demos comerciales y desarrollo del frontend sin depender del worker real.
