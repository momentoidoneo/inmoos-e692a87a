
# Iteración 4 — Persistencia real + Buscador de portales inmobiliarios

Dos bloques paralelos: (A) terminar lo que falta de la app subiendo módulos clave a persistencia real, y (B) montar un módulo nuevo "Oportunidades" que busca en portales inmobiliarios con la arquitectura correcta para no ser bloqueado.

---

## Parte A — Lo que falta por consolidar

### A1. Persistencia real en Cloud para módulos núcleo
Migrar de mock → tablas Supabase con RLS por tenant:

- **`leads`** + **`lead_notes`** + **`lead_activity`** (timeline real)
- **`properties`**
- **`visits`**
- **`tasks`**

Cada tabla con `tenant_id`, RLS usando `is_member_of_tenant()`, índices por `tenant_id + status`, y trigger `set_updated_at`. El service layer mantiene la misma interfaz: cambio `MockLeadsService` por `SupabaseLeadsService` en `services/index.ts`. Páginas existentes siguen funcionando sin tocar.

Documentos, conocimiento, automatizaciones y AI **se quedan mock** apuntando a tu backend FastAPI futuro (es la decisión del plan híbrido original).

### A2. Seed inicial por tenant
Botón en Onboarding y en Configuración → "Cargar datos demo" que inserta el seed coherente actual (60 leads, 25 inmuebles, etc.) ya en la BD del tenant. Útil para presentaciones comerciales sin contaminar tenants reales.

### A3. Perfil editable real
Página `/perfil` lee/escribe `profiles` (nombre, teléfono, avatar). Cambio de contraseña vía Supabase Auth.

### A4. Configuración de inmobiliaria real
`/configuracion` edita `tenants` (nombre, logo, color primario) — solo admin. El color primario alimenta una CSS var para branding suave por tenant.

---

## Parte B — Módulo "Oportunidades" (búsqueda en portales)

### B1. Por qué esto NO puede vivir en Lovable ni en Edge Functions

Idealista, Fotocasa, Habitaclia y similares tienen defensas anti-bot serias:
- **DataDome / PerimeterX / Cloudflare** con fingerprinting de TLS, canvas, WebGL, fuentes y comportamiento.
- **Bloqueo por IP de datacenter** (AWS, GCP, Supabase Edge → bloqueados en minutos).
- **Rate limiting agresivo** y CAPTCHAs.
- **Detección de headless** (navigator.webdriver, plugins, user-agent, timing de eventos).

Edge Functions de Supabase (Deno serverless, IPs de datacenter, sin navegador real) **serán bloqueadas en la primera petición**. Lovable solo construye frontend; no puede ejecutar navegadores.

**Además existe riesgo legal**: Idealista tiene jurisprudencia favorable contra scraping (caso Idealista vs Rentola). Hay que tratarlo como riesgo conocido del cliente, no como funcionalidad oficial.

### B2. Arquitectura correcta — Worker externo

```
┌──────────────┐    1. POST /search        ┌──────────────────┐
│  InmoOS UI   │ ────────────────────────► │  Edge Function   │
│ (Lovable)    │ ◄───── job_id ──────────── │  scraper-jobs    │
└──────────────┘                            └────────┬─────────┘
       ▲                                             │ enqueue
       │                                             ▼
       │                                    ┌──────────────────┐
       │ 3. Realtime subscribe              │  scraper_jobs    │
       │ (postgres_changes)                 │  table (Cloud)   │
       │                                    └────────┬─────────┘
       │                                             │ poll
       │                                             ▼
       │                                    ┌──────────────────────┐
       │ 4. Resultados aparecen             │  Worker externo      │
       └─────────────────────────────────── │  (TU servidor):      │
                                            │  Playwright stealth  │
                                            │  + proxies residenc. │
                                            └──────────────────────┘
```

**Worker externo (lo monta tu equipo, fuera de Lovable):**
- **Playwright + `playwright-extra` + `puppeteer-extra-plugin-stealth`** (parchea webdriver, plugins, languages, WebGL).
- **Proxies residenciales rotatorios** (Bright Data, Smartproxy, Oxylabs, IPRoyal) — sin esto, te bloquean en horas.
- **Navegación humanizada**: viewport real, movimientos de ratón con curvas Bézier, scroll con easing, delays aleatorios 800-3500 ms entre acciones, aceptar cookies, simular foco/blur.
- **Fingerprint rotativo** por job (UA + plataforma + zona horaria + idioma coherentes).
- **Cola Redis/BullMQ** con concurrencia baja (2-4 jobs) y backoff exponencial ante 403/429.
- **Persistencia de sesión** entre jobs del mismo proxy para parecer un usuario que vuelve.
- **Caché de resultados** 6-24 h por hash de query (reduce peticiones y coste).
- **Parsing por adapter** (un adapter por portal: `IdealistaAdapter`, `FotocasaAdapter`, `HabitacliaAdapter`) que extrae cards de resultado del HTML/DOM.

**Comunicación worker ↔ Cloud:**
- El worker hace `poll` o `LISTEN/NOTIFY` sobre la tabla `scraper_jobs` en Postgres (la BD de Lovable Cloud es accesible vía connection string).
- Inserta resultados en `scraper_results` ligados al `job_id`.
- La UI escucha por **Supabase Realtime** sobre esa tabla y los resultados aparecen en streaming.

### B3. Lo que entrega esta iteración (lado Lovable)

Toda la infraestructura del lado UI/Cloud para que cuando tengas el worker desplegado, funcione end-to-end. Mientras tanto, hay un **simulador de worker** dentro de la propia Edge Function que devuelve resultados realistas mock (10-20 anuncios coherentes con los filtros) para poder demostrar el flujo a clientes.

**Tablas nuevas (Cloud):**
- `scraper_jobs`: `id, tenant_id, user_id, params (jsonb), status (queued|running|done|error|partial), portals (text[]), progress, results_count, error, created_at, started_at, finished_at`
- `scraper_results`: `id, job_id, tenant_id, portal, external_id, url, title, price, surface_m2, rooms, bathrooms, property_type, operation, address, zone, city, lat, lng, listing_type (particular|agencia), images (text[]), description, published_at, raw (jsonb), created_at`. Único `(job_id, portal, external_id)`.
- `saved_searches`: búsquedas guardadas reutilizables por usuario.
- RLS por tenant en todas.
- Realtime habilitado en `scraper_jobs` y `scraper_results`.

**Edge Functions:**
- `scraper-create-job`: valida con Zod, crea registro `queued` en `scraper_jobs`. Si `WORKER_WEBHOOK_URL` está configurada, hace POST al worker para despertarlo.
- `scraper-cancel-job`: marca `cancelled`.
- `scraper-mock-worker`: **stub temporal** que simula el worker (genera resultados ficticios coherentes con los filtros y los inserta progresivamente con delays). Se desactiva automáticamente cuando configures el secret `WORKER_WEBHOOK_URL` real.
- `scraper-ingest-results` (con header `X-Worker-Token`): endpoint que tu worker externo llamará para insertar resultados de forma segura (alternativa a conexión directa a Postgres).

**Service layer:**
- `services/opportunities.service.ts` con interfaz `createSearch / getJob / listJobs / streamResults / saveSearch / listSaved / convertToLead / convertToProperty`.
- Implementación Supabase real (no mock).

**Página `/oportunidades`** (en sidebar, grupo "Comercial", icono `Search`):
- **Panel de filtros** (formulario con react-hook-form + zod):
  - Operación: compra / alquiler / alquiler temporal
  - Tipo: piso / casa / ático / dúplex / estudio / local / oficina / garaje / terreno (multi)
  - Ubicación: ciudad + zonas (multi-select), o búsqueda libre
  - Radio en km (si geocoding disponible)
  - Precio min/max
  - Superficie min/max (m²)
  - Habitaciones min, baños min
  - Anunciante: particular / agencia / ambos
  - Estado: nuevo / segunda mano / obra nueva
  - Extras: ascensor, terraza, parking, piscina, exterior, amueblado, mascotas
  - Antigüedad del anuncio (24h / 7d / 30d / cualquiera)
  - Portales a consultar (checkboxes: Idealista, Fotocasa, Habitaclia) — multi
- **Botón "Buscar"** → crea job → la pantalla cambia a vista de resultados en streaming.
- **Vista de resultados**:
  - Indicador de progreso por portal (chip "Idealista: 12 resultados · Fotocasa: en curso…").
  - Toggle Tabla / Tarjetas / Mapa (mapa con leaflet si hay coordenadas).
  - Cada resultado: imagen, título, precio, m², habs, zona, anunciante (badge particular/agencia), portal (badge), botón "Ver anuncio" (abre URL original), botón "Convertir en inmueble" (lo crea en `properties` del tenant), botón "Crear lead asociado".
  - Filtrado/ordenación cliente: precio, €/m², fecha publicación, superficie.
  - Deduplicación cliente entre portales por `título + precio + superficie` (los mismos pisos aparecen en varios portales).
- **Búsquedas guardadas**: panel lateral con las búsquedas del usuario, "Re-ejecutar", "Programar diaria" (cron, queda preparado, ejecución cuando el worker exista).
- **Histórico de jobs**: tabla con jobs anteriores, estado, nº resultados, fecha.

### B4. Aviso legal y de uso
En la primera entrada al módulo, modal informativo de un solo uso:
> "El uso de este módulo para extraer datos de portales puede infringir sus términos de servicio. Esta funcionalidad debe operarse desde infraestructura propia con proxies residenciales y respeto a robots.txt y rate limits razonables. InmoOS provee la infraestructura de orquestación; la responsabilidad del uso recae en el cliente."

Aceptación guardada en `profiles.scraper_terms_accepted_at`.

### B5. Documentación entregable
Archivo `docs/scraper-worker.md` con:
- Stack recomendado (Node 20 + Playwright + stealth + BullMQ + Redis + proveedor de proxies).
- Esqueleto de adapter por portal.
- Contrato exacto de tablas y endpoints de ingesta.
- Variables de entorno necesarias.
- Recomendaciones de rate limit (≤1 req/8s por proxy por dominio, ≤30 jobs/hora por tenant).

---

## Decisiones técnicas resumidas

- **Realtime** sobre `scraper_jobs` + `scraper_results` para UX en streaming.
- **Edge Function como mock-worker temporal** para que la demo funcione hoy; se desconecta solo cuando configures `WORKER_WEBHOOK_URL`.
- **Worker real fuera de Lovable** — no negociable técnicamente.
- **Resultados normalizados** a un esquema único; `raw` jsonb guarda la respuesta original de cada portal por si se necesitan campos extra.
- **Conversión 1-clic** de oportunidad → `properties` o → `leads`, cerrando el ciclo comercial.

---

## Orden de ejecución sugerido

1. Migraciones de la Parte A (leads/properties/visits/tasks) + servicios Supabase.
2. Perfil y configuración de tenant editables.
3. Migraciones del scraper + Edge Functions + mock-worker.
4. Página `/oportunidades` completa.
5. Documentación del worker externo.

¿Procedemos?
