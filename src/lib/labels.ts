import type {
  LeadStatus, LeadScore, LeadChannel, LeadSource, OperationType,
  PropertyType, PropertyStatus, VisitStatus, TaskType, TaskStatus,
  DocumentCategory, KnowledgeCategory, FinancingStatus, Urgency, AppRole,
  AutomationTrigger, IntegrationKind,
} from "@/modules/types";

export const leadStatusLabel: Record<LeadStatus, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  cualificado: "Cualificado",
  visita_agendada: "Visita agendada",
  visita_realizada: "Visita realizada",
  seguimiento: "En seguimiento",
  oferta: "Oferta",
  ganado: "Ganado",
  perdido: "Perdido",
  descartado: "Descartado",
};

export const leadScoreLabel: Record<LeadScore, string> = {
  caliente: "Caliente",
  templado: "Templado",
  frio: "Frío",
  descartable: "Descartable",
};

export const leadChannelLabel: Record<LeadChannel, string> = {
  whatsapp: "WhatsApp",
  email: "Email",
  telefono: "Teléfono",
  web: "Web",
  portal: "Portal",
  referido: "Referido",
  presencial: "Presencial",
};

export const leadSourceLabel: Record<LeadSource, string> = {
  idealista: "Idealista",
  fotocasa: "Fotocasa",
  habitaclia: "Habitaclia",
  web_propia: "Web propia",
  google_ads: "Google Ads",
  meta_ads: "Meta Ads",
  referido: "Referido",
  presencial: "Presencial",
  otro: "Otro",
};

export const operationLabel: Record<OperationType, string> = {
  compra: "Compra",
  alquiler: "Alquiler",
  alquiler_temporal: "Alquiler temporal",
  traspaso: "Traspaso",
};

export const propertyTypeLabel: Record<PropertyType, string> = {
  piso: "Piso", casa: "Casa", atico: "Ático", duplex: "Dúplex",
  estudio: "Estudio", local: "Local", oficina: "Oficina",
  garaje: "Garaje", terreno: "Terreno",
};

export const propertyStatusLabel: Record<PropertyStatus, string> = {
  disponible: "Disponible",
  reservado: "Reservado",
  vendido: "Vendido",
  alquilado: "Alquilado",
  retirado: "Retirado",
};

export const visitStatusLabel: Record<VisitStatus, string> = {
  propuesta: "Propuesta",
  confirmada: "Confirmada",
  realizada: "Realizada",
  no_show: "No show",
  cancelada: "Cancelada",
  reagendada: "Reagendada",
};

export const taskTypeLabel: Record<TaskType, string> = {
  llamada: "Llamada",
  seguimiento: "Seguimiento",
  documentacion: "Documentación",
  visita: "Visita",
  incidencia: "Incidencia",
  email: "Email",
  whatsapp: "WhatsApp",
};

export const taskStatusLabel: Record<TaskStatus, string> = {
  pendiente: "Pendiente",
  en_curso: "En curso",
  completada: "Completada",
  vencida: "Vencida",
  cancelada: "Cancelada",
};

export const documentCategoryLabel: Record<DocumentCategory, string> = {
  contrato: "Contrato",
  reserva: "Reserva",
  nota_simple: "Nota simple",
  escritura: "Escritura",
  interno: "Interno",
  ficha_comercial: "Ficha comercial",
  identidad: "Identidad",
  otro: "Otro",
};

export const knowledgeCategoryLabel: Record<KnowledgeCategory, string> = {
  faq: "FAQ",
  proceso: "Proceso",
  argumentario: "Argumentario",
  politica: "Política",
  respuesta_modelo: "Respuesta modelo",
  zona: "Zona",
  empresa: "Empresa",
};

export const financingLabel: Record<FinancingStatus, string> = {
  aprobada: "Aprobada",
  pendiente: "Pendiente",
  no_aprobada: "No aprobada",
  no_necesita: "No necesita",
};

export const urgencyLabel: Record<Urgency, string> = {
  inmediata: "Inmediata",
  "1_3_meses": "1-3 meses",
  "3_6_meses": "3-6 meses",
  mas_6_meses: "+6 meses",
};

export const roleLabel: Record<AppRole, string> = {
  super_admin: "Super-admin",
  admin: "Admin",
  director: "Director comercial",
  agente: "Agente comercial",
  backoffice: "Backoffice",
};

export const automationTriggerLabel: Record<AutomationTrigger, string> = {
  lead_created: "Lead creado",
  lead_no_response_24h: "Sin respuesta 24h",
  lead_no_response_72h: "Sin respuesta 72h",
  visit_completed: "Visita realizada",
  lead_dormant_15d: "Lead dormido 15d",
  document_pending: "Documentación pendiente",
};

export const integrationKindLabel: Record<IntegrationKind, string> = {
  whatsapp: "WhatsApp Business",
  email: "Email",
  crm: "CRM externo",
  web_form: "Formularios web",
  calendar: "Calendario",
  custom_api: "API personalizada",
};
