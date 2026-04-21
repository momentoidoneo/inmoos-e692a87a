/**
 * Coherent seed dataset for InmoOS demo / dev.
 * Tenants, users, leads, properties, visits, tasks, documents, knowledge, automations
 * are cross-linked so the UI feels real.
 */

import type {
  Tenant, User, Lead, Property, Visit, Task, DocumentFile,
  KnowledgeArticle, AutomationRule, Integration, Template, Activity, Note,
} from "@/modules/types";

const TENANT_ID = "tenant-1";

export const seedTenants: Tenant[] = [
  {
    id: TENANT_ID,
    name: "Vértice Inmobiliaria",
    slug: "vertice",
    createdAt: "2024-01-15T09:00:00Z",
  },
];

export const seedUsers: User[] = [
  { id: "u-1", tenantId: TENANT_ID, name: "Carlos Méndez", email: "carlos@vertice.es", role: "admin", active: true, phone: "+34 600 100 001" },
  { id: "u-2", tenantId: TENANT_ID, name: "Laura Giménez", email: "laura@vertice.es", role: "director", active: true, phone: "+34 600 100 002" },
  { id: "u-3", tenantId: TENANT_ID, name: "Marcos Ruiz", email: "marcos@vertice.es", role: "agente", active: true, phone: "+34 600 100 003" },
  { id: "u-4", tenantId: TENANT_ID, name: "Sara Domínguez", email: "sara@vertice.es", role: "agente", active: true, phone: "+34 600 100 004" },
  { id: "u-5", tenantId: TENANT_ID, name: "Iván Torres", email: "ivan@vertice.es", role: "agente", active: true, phone: "+34 600 100 005" },
  { id: "u-6", tenantId: TENANT_ID, name: "Nuria Castro", email: "nuria@vertice.es", role: "backoffice", active: true, phone: "+34 600 100 006" },
];

const zonesMadrid = ["Salamanca", "Chamberí", "Retiro", "Chamartín", "Centro", "Moncloa", "Tetuán", "Arganzuela"];
const zonesBarcelona = ["Eixample", "Gràcia", "Sarrià", "Sant Gervasi", "Born", "Poblenou", "Les Corts"];
const zonesValencia = ["Ruzafa", "Ensanche", "El Carmen", "Algirós", "Patraix"];

const allZones = [...zonesMadrid, ...zonesBarcelona, ...zonesValencia];
const cityFor = (z: string) =>
  zonesMadrid.includes(z) ? "Madrid" : zonesBarcelona.includes(z) ? "Barcelona" : "Valencia";

const propertyImages = [
  "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800",
  "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
  "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800",
];

const propertyTypes = ["piso", "casa", "atico", "duplex", "estudio"] as const;
const operations = ["compra", "alquiler"] as const;

function rand<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function daysAgo(d: number): string {
  return new Date(Date.now() - d * 86400000 - randInt(0, 23) * 3600000).toISOString();
}
function daysFromNow(d: number): string {
  return new Date(Date.now() + d * 86400000 + randInt(0, 8) * 3600000).toISOString();
}

/* ───────── Properties (25) ───────── */
const propertyTitles = [
  "Piso reformado con balcón", "Ático con terraza vistas", "Casa adosada con jardín",
  "Dúplex luminoso de diseño", "Estudio céntrico totalmente amueblado",
  "Piso familiar de 3 dormitorios", "Vivienda de lujo con piscina",
  "Loft industrial reformado", "Bajo con patio privado",
  "Piso de obra nueva", "Vivienda histórica restaurada",
  "Apartamento con vistas al mar", "Casa de pueblo con encanto",
  "Ático dúplex con solárium", "Piso amplio en finca clásica",
];

export const seedProperties: Property[] = Array.from({ length: 25 }).map((_, i) => {
  const zone = rand(allZones);
  const city = cityFor(zone);
  const type = rand(propertyTypes);
  const operation = rand(operations);
  const surface = randInt(45, 240);
  const bedrooms = randInt(1, 5);
  const basePrice = operation === "alquiler" ? randInt(900, 4500) : randInt(180000, 1200000);
  return {
    id: `prop-${i + 1}`,
    tenantId: TENANT_ID,
    reference: `VRT-${String(1000 + i)}`,
    title: rand(propertyTitles),
    type,
    operation,
    status: rand(["disponible", "disponible", "disponible", "reservado", "vendido"] as const),
    price: basePrice,
    address: `Calle ${rand(["Mayor", "Real", "Goya", "Velázquez", "Princesa", "Serrano", "Aragó", "Balmes"])} ${randInt(1, 200)}`,
    zone,
    city,
    surface,
    bedrooms,
    bathrooms: randInt(1, 3),
    description: "Vivienda exterior con buena distribución, orientación sur, en zona consolidada con todos los servicios. Ideal primera vivienda o inversión.",
    features: ["Ascensor", "Aire acondicionado", "Calefacción", "Trastero"].filter(() => Math.random() > 0.3),
    imageUrl: propertyImages[i % propertyImages.length],
    agentId: rand(["u-3", "u-4", "u-5"]),
    createdAt: daysAgo(randInt(5, 120)),
  };
});

/* ───────── Leads (60) ───────── */
const firstNames = ["Ana", "Luis", "María", "Pablo", "Elena", "Javier", "Carmen", "David", "Lucía", "Pedro", "Sofía", "Manuel", "Paula", "Andrés", "Beatriz", "Raúl", "Cristina", "Diego", "Marta", "Alberto", "Eva", "Sergio", "Patricia", "Hugo", "Natalia", "Gonzalo", "Irene", "Adrián", "Clara", "Rubén"];
const lastNames = ["García", "López", "Martínez", "Rodríguez", "Pérez", "Sánchez", "Fernández", "González", "Romero", "Jiménez", "Hernández", "Díaz", "Moreno", "Álvarez", "Muñoz", "Gil", "Ortega", "Serrano"];

const channels = ["whatsapp", "email", "telefono", "web", "portal"] as const;
const sources = ["idealista", "fotocasa", "habitaclia", "web_propia", "google_ads", "meta_ads", "referido"] as const;
const statuses = ["nuevo", "nuevo", "contactado", "contactado", "cualificado", "visita_agendada", "visita_realizada", "seguimiento", "oferta", "ganado", "perdido", "descartado"] as const;
const scores = ["caliente", "templado", "templado", "frio", "frio", "descartable"] as const;
const priorities = ["alta", "media", "media", "baja"] as const;
const tagsPool = ["primera_vivienda", "inversor", "urgente", "vip", "internacional", "financiacion_ok", "pendiente_visita", "post_visita"];

export const seedLeads: Lead[] = Array.from({ length: 60 }).map((_, i) => {
  const name = `${rand(firstNames)} ${rand(lastNames)} ${rand(lastNames)}`;
  const status = rand(statuses);
  const score = rand(scores);
  const operation = rand(operations);
  const property = rand(seedProperties);
  const budgetMax = operation === "alquiler" ? randInt(900, 3500) : randInt(200000, 900000);
  return {
    id: `lead-${i + 1}`,
    tenantId: TENANT_ID,
    name,
    email: `${name.split(" ")[0].toLowerCase()}.${name.split(" ")[1].toLowerCase()}@email.com`,
    phone: `+34 6${randInt(10, 99)} ${randInt(100, 999)} ${randInt(100, 999)}`,
    channel: rand(channels),
    source: rand(sources),
    status,
    priority: rand(priorities),
    score,
    scoreReason: score === "caliente"
      ? "Financiación aprobada, urgencia inmediata y presupuesto alineado con inmuebles disponibles."
      : score === "templado"
      ? "Buena intención y presupuesto, pero financiación pendiente."
      : score === "frio"
      ? "Presupuesto bajo y urgencia diferida; requiere reactivación."
      : "Datos incompletos o presupuesto fuera de mercado.",
    assignedTo: rand(["u-3", "u-4", "u-5", undefined as unknown as string]),
    propertyOfInterestId: property.id,
    qualification: {
      budgetMin: Math.round(budgetMax * 0.8),
      budgetMax,
      financing: rand(["aprobada", "pendiente", "no_aprobada", "no_necesita"] as const),
      urgency: rand(["inmediata", "1_3_meses", "3_6_meses", "mas_6_meses"] as const),
      operation,
      zones: [property.zone, ...allZones.filter(() => Math.random() > 0.85)].slice(0, 3),
      propertyTypes: [property.type],
      bedrooms: randInt(1, 4),
      bathrooms: randInt(1, 2),
      features: ["Terraza", "Ascensor", "Garaje", "Exterior"].filter(() => Math.random() > 0.5),
      profile: rand(["Familia joven", "Inversor", "Profesional soltero", "Pareja sin hijos", "Familia numerosa"]),
      intent: rand(["Cambiar de vivienda", "Primera compra", "Inversión", "Reubicación laboral"]),
    },
    tags: tagsPool.filter(() => Math.random() > 0.7).slice(0, 3),
    nextAction: rand(["Llamar para confirmar visita", "Enviar fichas adicionales", "Solicitar documentación", "Agendar segunda visita", "Negociar oferta"]),
    nextActionAt: daysFromNow(randInt(0, 7)),
    lastActivityAt: daysAgo(randInt(0, 20)),
    createdAt: daysAgo(randInt(1, 90)),
    aiSummary: `${name.split(" ")[0]} busca ${operation} de ${property.type} en ${property.zone}. Presupuesto hasta ${budgetMax.toLocaleString("es-ES")} €. Perfil ${score}, urgencia ${score === "caliente" ? "alta" : "media"}.`,
    aiNextAction: status === "nuevo"
      ? "Contactar en menos de 1h por WhatsApp con saludo personalizado y 2-3 inmuebles compatibles."
      : status === "contactado"
      ? "Cualificar financiación y agendar visita esta semana."
      : status === "visita_realizada"
      ? "Hacer seguimiento en 48h con feedback estructurado y proponer alternativas si procede."
      : "Mantener cadencia de seguimiento y proponer reactivación con nuevas oportunidades.",
  };
});

/* ───────── Visits (30) ───────── */
export const seedVisits: Visit[] = Array.from({ length: 30 }).map((_, i) => {
  const lead = rand(seedLeads);
  const offset = randInt(-15, 15);
  return {
    id: `visit-${i + 1}`,
    tenantId: TENANT_ID,
    leadId: lead.id,
    propertyId: lead.propertyOfInterestId ?? rand(seedProperties).id,
    agentId: lead.assignedTo ?? rand(["u-3", "u-4", "u-5"]),
    scheduledAt: offset >= 0 ? daysFromNow(offset) : daysAgo(-offset),
    durationMin: rand([30, 45, 60]),
    status: offset > 0 ? rand(["propuesta", "confirmada"] as const) : rand(["realizada", "realizada", "no_show", "cancelada"] as const),
    outcome: offset <= 0 ? rand(["muy_interesado", "interesado", "neutral", "no_interesado"] as const) : undefined,
    notes: offset <= 0 ? "Cliente mostró interés en la distribución pero pidió valorar alternativas con más luz natural." : undefined,
    createdAt: daysAgo(randInt(1, 30)),
  };
});

/* ───────── Tasks (40) ───────── */
const taskTitles: Record<string, string[]> = {
  llamada: ["Llamar para cualificar", "Llamada de seguimiento", "Confirmar visita por teléfono"],
  seguimiento: ["Seguimiento post-visita", "Reactivación lead dormido", "Enviar resumen de visita"],
  documentacion: ["Solicitar nóminas", "Revisar contrato firmado", "Recopilar documentación financiación"],
  visita: ["Preparar visita inmueble", "Visita programada"],
  incidencia: ["Resolver incidencia con propietario", "Gestionar queja del cliente"],
  email: ["Enviar fichas comerciales", "Responder consulta por email"],
  whatsapp: ["Enviar plantilla de bienvenida", "Compartir alternativas por WhatsApp"],
};

export const seedTasks: Task[] = Array.from({ length: 40 }).map((_, i) => {
  const lead = rand(seedLeads);
  const type = rand(["llamada", "seguimiento", "documentacion", "visita", "incidencia", "email", "whatsapp"] as const);
  const offset = randInt(-5, 10);
  return {
    id: `task-${i + 1}`,
    tenantId: TENANT_ID,
    type,
    title: rand(taskTitles[type]),
    description: `Relacionada con ${lead.name}`,
    status: offset < 0 ? rand(["completada", "vencida"] as const) : rand(["pendiente", "pendiente", "en_curso"] as const),
    priority: rand(["alta", "media", "media", "baja"] as const),
    assignedTo: lead.assignedTo ?? rand(["u-3", "u-4", "u-5"]),
    leadId: lead.id,
    propertyId: lead.propertyOfInterestId,
    dueAt: offset >= 0 ? daysFromNow(offset) : daysAgo(-offset),
    completedAt: offset < 0 && Math.random() > 0.3 ? daysAgo(-offset - 1) : undefined,
    createdAt: daysAgo(randInt(1, 20)),
  };
});

/* ───────── Documents (12) ───────── */
const docCategories = ["contrato", "reserva", "nota_simple", "escritura", "interno", "ficha_comercial", "identidad"] as const;
export const seedDocuments: DocumentFile[] = Array.from({ length: 12 }).map((_, i) => {
  const lead = rand(seedLeads);
  const cat = rand(docCategories);
  const status = rand(["listo", "listo", "listo", "procesando", "subido"] as const);
  return {
    id: `doc-${i + 1}`,
    tenantId: TENANT_ID,
    name: `${cat}_${lead.name.split(" ")[0]}_${i + 1}.pdf`,
    category: cat,
    status,
    sizeBytes: randInt(120000, 5_000_000),
    mimeType: "application/pdf",
    leadId: lead.id,
    propertyId: lead.propertyOfInterestId,
    uploadedBy: rand(["u-3", "u-4", "u-5", "u-6"]),
    uploadedAt: daysAgo(randInt(1, 30)),
    summary: status === "listo" ? "Documento conforme. Datos del titular y referencia catastral coinciden con la ficha del inmueble." : undefined,
    extractedData: status === "listo" ? {
      Titular: lead.name,
      DNI: `${randInt(10000000, 99999999)}X`,
      Referencia: `${randInt(1000000, 9999999)}`,
      Fecha: new Date().toLocaleDateString("es-ES"),
    } : undefined,
  };
});

/* ───────── Knowledge (12) ───────── */
export const seedKnowledge: KnowledgeArticle[] = [
  { id: "kn-1", tenantId: TENANT_ID, title: "Proceso de captación de inmuebles", category: "proceso", tags: ["captacion", "operativa"], contentMd: "# Captación\n\n1. Visita al inmueble\n2. Valoración comparativa\n3. Firma de hoja de encargo...", version: 2, authorId: "u-2", createdAt: daysAgo(120), updatedAt: daysAgo(15) },
  { id: "kn-2", tenantId: TENANT_ID, title: "Argumentario financiación", category: "argumentario", tags: ["ventas", "hipoteca"], contentMd: "## Cómo presentar nuestras ventajas hipotecarias...", version: 1, authorId: "u-2", createdAt: daysAgo(80), updatedAt: daysAgo(80) },
  { id: "kn-3", tenantId: TENANT_ID, title: "FAQ: comisiones y honorarios", category: "faq", tags: ["faq", "comisiones"], contentMd: "**¿Cuál es la comisión?**\n\nDel 3% al 5%...", version: 1, authorId: "u-1", createdAt: daysAgo(60), updatedAt: daysAgo(60) },
  { id: "kn-4", tenantId: TENANT_ID, title: "Política de protección de datos", category: "politica", tags: ["legal", "rgpd"], contentMd: "Conforme al RGPD...", version: 3, authorId: "u-1", createdAt: daysAgo(200), updatedAt: daysAgo(10) },
  { id: "kn-5", tenantId: TENANT_ID, title: "Respuesta modelo: primer contacto WhatsApp", category: "respuesta_modelo", tags: ["whatsapp", "primer_contacto"], contentMd: "Hola {nombre}, soy {agente} de Vértice...", version: 4, authorId: "u-2", createdAt: daysAgo(90), updatedAt: daysAgo(5) },
  { id: "kn-6", tenantId: TENANT_ID, title: "Zona Salamanca — guía comercial", category: "zona", tags: ["madrid", "salamanca"], contentMd: "Barrio premium de Madrid...", version: 1, authorId: "u-3", createdAt: daysAgo(40), updatedAt: daysAgo(40) },
  { id: "kn-7", tenantId: TENANT_ID, title: "Zona Eixample — guía comercial", category: "zona", tags: ["barcelona", "eixample"], contentMd: "Distrito céntrico de Barcelona...", version: 1, authorId: "u-4", createdAt: daysAgo(35), updatedAt: daysAgo(35) },
  { id: "kn-8", tenantId: TENANT_ID, title: "Proceso de firma ante notario", category: "proceso", tags: ["cierre", "notaria"], contentMd: "Pasos previos a la firma...", version: 2, authorId: "u-1", createdAt: daysAgo(70), updatedAt: daysAgo(20) },
  { id: "kn-9", tenantId: TENANT_ID, title: "FAQ: tiempos de respuesta a leads", category: "faq", tags: ["faq", "leads"], contentMd: "Objetivo SLA: <30 min en horario comercial...", version: 1, authorId: "u-2", createdAt: daysAgo(25), updatedAt: daysAgo(25) },
  { id: "kn-10", tenantId: TENANT_ID, title: "Argumentario alquiler vs compra", category: "argumentario", tags: ["ventas", "alquiler"], contentMd: "Comparativa para clientes indecisos...", version: 1, authorId: "u-3", createdAt: daysAgo(50), updatedAt: daysAgo(50) },
  { id: "kn-11", tenantId: TENANT_ID, title: "Empresa: misión y valores", category: "empresa", tags: ["empresa"], contentMd: "Vértice nace en 2015...", version: 1, authorId: "u-1", createdAt: daysAgo(300), updatedAt: daysAgo(300) },
  { id: "kn-12", tenantId: TENANT_ID, title: "Respuesta modelo: post-visita", category: "respuesta_modelo", tags: ["post_visita"], contentMd: "Hola {nombre}, gracias por la visita...", version: 2, authorId: "u-4", createdAt: daysAgo(45), updatedAt: daysAgo(7) },
];

/* ───────── Automations (5) ───────── */
export const seedAutomations: AutomationRule[] = [
  { id: "auto-1", tenantId: TENANT_ID, name: "Bienvenida nuevo lead", description: "Envío inmediato de plantilla y creación de tarea de cualificación.", trigger: "lead_created", conditions: [], steps: [
    { id: "s1", kind: "send_template", config: { templateId: "tpl-1", channel: "whatsapp" } },
    { id: "s2", kind: "create_task", config: { type: "llamada", title: "Cualificar lead nuevo", dueInHours: 2 } },
  ], enabled: true, lastRunAt: daysAgo(0), runsCount: 142, createdAt: daysAgo(60) },
  { id: "auto-2", tenantId: TENANT_ID, name: "Recordatorio sin respuesta 24h", trigger: "lead_no_response_24h", conditions: [{ field: "status", op: "=", value: "contactado" }], steps: [
    { id: "s1", kind: "send_template", config: { templateId: "tpl-2", channel: "whatsapp" } },
    { id: "s2", kind: "notify_agent", config: {} },
  ], enabled: true, lastRunAt: daysAgo(1), runsCount: 78, createdAt: daysAgo(50) },
  { id: "auto-3", tenantId: TENANT_ID, name: "Seguimiento post-visita", trigger: "visit_completed", conditions: [], steps: [
    { id: "s1", kind: "wait", config: { hours: 24 } },
    { id: "s2", kind: "send_template", config: { templateId: "tpl-3", channel: "whatsapp" } },
    { id: "s3", kind: "create_task", config: { type: "seguimiento", title: "Recoger feedback de visita", dueInHours: 48 } },
  ], enabled: true, lastRunAt: daysAgo(2), runsCount: 56, createdAt: daysAgo(40) },
  { id: "auto-4", tenantId: TENANT_ID, name: "Reactivación leads dormidos", trigger: "lead_dormant_15d", conditions: [{ field: "status", op: "!=", value: "perdido" }], steps: [
    { id: "s1", kind: "send_template", config: { templateId: "tpl-4", channel: "email" } },
    { id: "s2", kind: "change_status", config: { to: "seguimiento" } },
  ], enabled: false, lastRunAt: daysAgo(10), runsCount: 23, createdAt: daysAgo(30) },
  { id: "auto-5", tenantId: TENANT_ID, name: "Solicitud de documentación", trigger: "document_pending", conditions: [], steps: [
    { id: "s1", kind: "send_template", config: { templateId: "tpl-5", channel: "email" } },
    { id: "s2", kind: "create_task", config: { type: "documentacion", title: "Recordar documentación pendiente", dueInHours: 72 } },
  ], enabled: true, lastRunAt: daysAgo(3), runsCount: 34, createdAt: daysAgo(25) },
];

/* ───────── Templates ───────── */
export const seedTemplates: Template[] = [
  { id: "tpl-1", tenantId: TENANT_ID, name: "Bienvenida WhatsApp", channel: "whatsapp", body: "Hola {nombre}, soy {agente} de Vértice. Recibí tu interés por {inmueble}. ¿Cuándo podríamos hablar?", variables: ["nombre", "agente", "inmueble"] },
  { id: "tpl-2", tenantId: TENANT_ID, name: "Recordatorio 24h", channel: "whatsapp", body: "Hola {nombre}, te escribo de nuevo para confirmar tu interés en {inmueble}.", variables: ["nombre", "inmueble"] },
  { id: "tpl-3", tenantId: TENANT_ID, name: "Post-visita", channel: "whatsapp", body: "Gracias por la visita de ayer, {nombre}. ¿Qué te pareció {inmueble}?", variables: ["nombre", "inmueble"] },
  { id: "tpl-4", tenantId: TENANT_ID, name: "Reactivación email", channel: "email", subject: "Nuevas oportunidades para ti", body: "Hola {nombre}, hemos incorporado nuevos inmuebles que encajan con tu búsqueda...", variables: ["nombre"] },
  { id: "tpl-5", tenantId: TENANT_ID, name: "Documentación pendiente", channel: "email", subject: "Documentación pendiente", body: "Hola {nombre}, para avanzar con tu operación necesitamos los siguientes documentos...", variables: ["nombre"] },
];

/* ───────── Integrations ───────── */
export const seedIntegrations: Integration[] = [
  { id: "int-1", tenantId: TENANT_ID, kind: "whatsapp", name: "WhatsApp Business API", connected: true, webhookUrl: "https://api.inmoos.app/webhooks/whatsapp/tenant-1" },
  { id: "int-2", tenantId: TENANT_ID, kind: "email", name: "Email transaccional", connected: true, webhookUrl: "https://api.inmoos.app/webhooks/email/tenant-1" },
  { id: "int-3", tenantId: TENANT_ID, kind: "web_form", name: "Formularios web", connected: true, webhookUrl: "https://api.inmoos.app/webhooks/form/tenant-1" },
  { id: "int-4", tenantId: TENANT_ID, kind: "calendar", name: "Google Calendar", connected: false },
  { id: "int-5", tenantId: TENANT_ID, kind: "crm", name: "CRM externo (Sage)", connected: false },
  { id: "int-6", tenantId: TENANT_ID, kind: "custom_api", name: "API personalizada", connected: false },
];

/* ───────── Activity feed ───────── */
export const seedActivities: Activity[] = Array.from({ length: 50 }).map((_, i) => {
  const lead = rand(seedLeads);
  const types = ["lead_created", "lead_status_changed", "lead_assigned", "note_added", "visit_scheduled", "visit_completed", "document_uploaded", "task_completed", "automation_executed"] as const;
  const type = rand(types);
  const messages: Record<typeof type, string> = {
    lead_created: `Nuevo lead: ${lead.name}`,
    lead_status_changed: `${lead.name} pasó a ${lead.status}`,
    lead_assigned: `${lead.name} asignado a un agente`,
    note_added: `Nota añadida en ${lead.name}`,
    visit_scheduled: `Visita programada con ${lead.name}`,
    visit_completed: `Visita completada con ${lead.name}`,
    document_uploaded: `Documento subido para ${lead.name}`,
    task_completed: `Tarea completada para ${lead.name}`,
    automation_executed: `Automatización ejecutada en ${lead.name}`,
  };
  return {
    id: `act-${i + 1}`,
    tenantId: TENANT_ID,
    type,
    actorId: rand(["u-2", "u-3", "u-4", "u-5"]),
    leadId: lead.id,
    message: messages[type],
    createdAt: daysAgo(randInt(0, 14)),
  };
});

/* ───────── Notes ───────── */
export const seedNotes: Note[] = Array.from({ length: 30 }).map((_, i) => {
  const lead = rand(seedLeads);
  return {
    id: `note-${i + 1}`,
    tenantId: TENANT_ID,
    leadId: lead.id,
    authorId: rand(["u-3", "u-4", "u-5"]),
    content: rand([
      "Cliente muy interesado en la zona, pide alternativas con balcón.",
      "Pendiente de aprobación bancaria. Volver a contactar en una semana.",
      "Prefiere visitar entre semana por la tarde.",
      "Mencionó posibilidad de incrementar presupuesto si encontramos algo singular.",
      "Acompañante tomará la decisión final. Agendar visita conjunta.",
    ]),
    createdAt: daysAgo(randInt(1, 30)),
  };
});

/* Sort everything most-recent-first */
seedLeads.sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime());
seedActivities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
seedTasks.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
seedVisits.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
