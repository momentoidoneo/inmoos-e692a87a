
# InmoOS — Sistema operativo comercial para inmobiliarias

SaaS multi-tenant vertical para inmobiliarias. Arquitectura híbrida: Lovable construye la capa de producto (UI, CRUDs, flujos, dashboards) y todo lo que requiere inteligencia (scoring, RAG, automatizaciones, parsing documental) se consume vía un **service layer tipado** preparado para enchufar a tu backend FastAPI + PostgreSQL + Redis + Qdrant + MinIO + OpenClaw.

## Decisiones aprobadas

- **Alcance v1:** los 10 módulos construidos con datos mock coherentes y estructura real.
- **Backend:** híbrido — Lovable Cloud para auth, tenants, usuarios y roles (multi-tenant real desde día 1). Leads, inmuebles, visitas, documentos viven mockeados detrás del service layer apuntando al backend externo.
- **Visual:** dual light/dark profesional. Neutros slate, acento azul sobrio, tipografía Inter, dark pulido (no invert).

---

## Arquitectura del proyecto

```
src/
├── app/                      # Layouts y shell
│   ├── AppShell.tsx          # Sidebar + topbar + breadcrumbs + buscador global
│   └── AuthLayout.tsx
├── pages/                    # Una por ruta
├── modules/                  # Lógica de dominio por módulo
│   ├── leads/                # componentes, hooks, tipos, mock data
│   ├── properties/
│   ├── visits/
│   ├── tasks/
│   ├── documents/
│   ├── knowledge/
│   ├── automations/
│   ├── dashboard/
│   └── settings/
├── services/                 # CAPA DE SERVICIOS (adapters)
│   ├── http/client.ts        # fetch tipado, interceptores, tenant header
│   ├── leads.service.ts      # interfaz + impl mock + impl REST
│   ├── ai.service.ts         # scoring, resumen, next-action (mock → backend)
│   ├── documents.service.ts  # upload + parsing (mock → MinIO/RAG)
│   ├── knowledge.service.ts  # artículos + búsqueda semántica (mock → Qdrant)
│   └── automations.service.ts
├── lib/                      # utils, formatters, validation (zod)
├── components/ui/            # shadcn
└── components/shared/        # DataTable, FilterBar, StatusBadge, Timeline, EmptyState…
```

**Patrón clave:** cada servicio expone una interfaz; hay implementación mock y un stub REST listo. Cambiar de mock a backend real = cambiar el binding en un único `services/index.ts`. Cero lógica de IA en componentes.

---

## Multi-tenant y roles (Lovable Cloud)

- Tablas: `tenants`, `profiles` (vinculado a `auth.users`), `user_roles` (tabla separada con enum `app_role`: `admin`, `director`, `agente`, `backoffice`), `user_tenants` (relación N:M).
- RLS en todas las tablas con función `has_role()` security definer.
- Header `X-Tenant-Id` inyectado automáticamente en todas las llamadas del service layer al backend externo.
- Hook `useCurrentTenant()` y `useRole()` para gating de UI.

---

## Diseño visual

- **Tokens HSL en `index.css`**: paleta neutra slate + acento `--primary` azul sobrio (`221 83% 53%` light / `217 91% 60%` dark), semánticos para `success/warning/danger/info`, superficies en 3 niveles (`bg`, `card`, `elevated`).
- Toggle light/dark con persistencia. Dark con superficies `slate-950 → slate-900 → slate-800`, bordes sutiles, no negro puro.
- Tipografía Inter, escalas tight para tablas densas, números tabulares en KPIs.
- Sidebar colapsable (icon mode), topbar fija con buscador global ⌘K, breadcrumbs, selector de tenant, avatar.
- Componentes compartidos: `DataTable` (sort, filter, paginación, selección, column visibility), `FilterBar`, `StatusBadge`, `ScoreBadge` (caliente/templado/frío/descartable), `Timeline`, `SidePanel` (detalle rápido sin perder contexto), `EmptyState`, `Skeleton`, `KpiCard`.

---

## Páginas y módulos

### 1. Auth
- `/login`, `/register`, `/reset-password` con email+password (Lovable Cloud). Onboarding mínimo de tenant tras primer registro.

### 2. Dashboard ejecutivo (`/`)
KPIs en tarjetas: leads nuevos (24h/7d), tiempo medio de respuesta, leads cualificados, visitas agendadas/realizadas, ratio lead→visita, ratio visita→cierre, operaciones cerradas, leads dormidos, tareas vencidas. Gráficos: embudo de conversión, leads por canal, actividad por agente, evolución semanal. Widgets: top agentes, leads calientes sin atender, próximas visitas.

### 3. Leads — Inbox comercial (`/leads`)
Tabla densa con: lead, origen, canal, inmueble de interés, estado, prioridad, **scoring visual**, agente asignado, próxima acción, tags, última actividad. Filtros avanzados (estado, canal, agente, score, fecha, zona, presupuesto), búsqueda, ordenación, selección masiva (asignar/cambiar estado/exportar). Vista alternativa **Kanban por estado**. Panel lateral de detalle rápido al hacer click sin salir de la lista.

### 4. Ficha de Lead (`/leads/:id`)
Layout 3 columnas:
- **Izquierda:** datos personales, contacto, presupuesto, operación, zona, tipo, urgencia, financiación, preferencias.
- **Centro:** Tabs `Resumen` / `Cualificación` / `Conversaciones` / `Visitas` / `Documentos` / `Notas`. Bloques destacados **"Resumen inteligente"** y **"Recomendación de siguiente acción"** (mock vía `ai.service.ts`, sustituible por endpoint real).
- **Derecha:** timeline cronológico completo, tareas pendientes, inmuebles vinculados.

### 5. Cualificación comercial
Formulario guiado por pasos dentro de la ficha: presupuesto, financiación (aprobada/pendiente/no), urgencia, operación, ubicación, características prioritarias, perfil, intención. Al guardar, recalcula score (mock determinista por reglas ahora, IA después) y muestra `ScoreBadge` + explicación textual del porqué.

### 6. Agenda y Visitas (`/agenda`)
Vistas: calendario mensual/semanal, por agente, por inmueble, listado. Crear/proponer visita, confirmar, reagendar, marcar no-show, registrar resultado con feedback estructurado. Recordatorios visibles. Cada visita enlaza a lead e inmueble.

### 7. Seguimiento y Automatizaciones (`/automations`)
- Vista de **colas inteligentes**: leads sin respuesta, dormidos, post-visita, pendientes de documentación, para reactivación.
- Editor de **reglas/secuencias**: trigger → condiciones → pasos (esperar, enviar plantilla, crear tarea, cambiar estado, notificar). Activar/desactivar, ver ejecuciones recientes, logs funcionales por lead. Ejecución real vivirá en backend; UI lista.

### 8. Inmuebles (`/properties`)
Listado con filtros (estado, operación, zona, precio, tipo). Ficha con galería, datos completos, agente responsable, leads asociados, visitas asociadas, histórico comercial. Acción "vincular a lead".

### 9. Documentos (`/documents`)
Upload (drag&drop), listado por categoría (contratos, reservas, notas simples, escrituras, internos, fichas). Estado de procesamiento (subido / procesando / listo / error). Vista de documento con: resumen, datos clave extraídos, **chat de preguntas al documento** — todo mock vía `documents.service.ts`, listo para RAG real.

### 10. Base de conocimiento (`/knowledge`)
CRUD de artículos: FAQs, procesos, argumentarios, políticas, respuestas modelo, info de zonas. Editor markdown, etiquetas, categorías, búsqueda, versionado simple (historial de revisiones). Pensada para alimentar agentes IA.

### 11. Tareas y Actividad (`/tasks`, `/activity`)
Tareas: lista priorizada, filtros por tipo (llamada/seguimiento/documentación/visita/incidencia), por agente, por vencimiento; vista "mis tareas" y "equipo". Actividad global: feed de cambios de estado, asignaciones, notas, visitas, uploads.

### 12. Equipo / Usuarios (`/team`)
Listado de miembros, rol, estado, métricas básicas. Invitar usuario, cambiar rol (gating por `admin`/`director`).

### 13. Configuración (`/settings`)
Subsecciones: inmobiliaria (datos, branding básico, logo), horarios, agentes, canales, plantillas (email/WhatsApp/SMS), estados personalizados, etiquetas, orígenes de lead.

### 14. Integraciones (`/integrations`)
Catálogo de tarjetas: WhatsApp Business, Email, CRM externo, formularios web, calendario, APIs custom. Cada una con estado (conectado/no), botón conectar (UI lista, conexión real vendrá del backend), webhook URL visible.

### 15. Perfil (`/profile`)
Datos personales, preferencias, notificaciones, cambio de contraseña, tema light/dark.

---

## Modelo de datos (entidades del dominio)

`Tenant`, `User`, `UserRole`, `Lead`, `LeadStatus` (enum), `LeadScore`, `Property`, `Visit`, `Task`, `Note`, `Activity`, `Document`, `AutomationRule`, `AutomationRun`, `Template`, `KnowledgeArticle`, `Integration`, `ContactChannel`, `Tag`. Tipos TypeScript en `modules/*/types.ts`, compartidos por mock y futuro cliente REST.

En Cloud (persistido ahora): `tenants`, `profiles`, `user_roles`, `user_tenants`. El resto vive mock detrás de servicios hasta conexión a tu FastAPI.

---

## Qué queda explícitamente mockeado (sustituible)

Cada servicio mock lleva comentario `// MOCK — replace with REST call to <endpoint>`:
- `ai.service.ts` → scoring, resumen lead, next-action, explicación score
- `documents.service.ts` → parsing, extracción, Q&A documental
- `knowledge.service.ts` → búsqueda semántica
- `automations.service.ts` → ejecución de reglas
- `leads/properties/visits/tasks.service.ts` → CRUD (listo para apuntar a tu API)

---

## Datos seed

Generador con ~60 leads realistas (nombres ES, zonas Madrid/Barcelona/Valencia), ~25 inmuebles, ~30 visitas, ~40 tareas, 12 artículos de conocimiento, 8 documentos, 5 reglas de automatización, 4 usuarios con roles distintos. Coherentes entre sí (un lead enlaza a inmueble real, sus visitas, sus tareas, su timeline).

---

## Entregable de esta iteración

Aplicación navegable end-to-end con los 10 módulos, auth real multi-tenant, roles, tema dual, datos seed coherentes, service layer completo y documentado. Lista para que conectes tu backend cambiando los bindings de servicios.
