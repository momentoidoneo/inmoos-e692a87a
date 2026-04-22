/**
 * InmoOS — Domain types
 * Shared by mock data and future REST clients.
 */

export type ID = string;

export type AppRole = "super_admin" | "admin" | "director" | "agente" | "backoffice";

export interface Tenant {
  id: ID;
  name: string;
  slug: string;
  logoUrl?: string;
  primaryColor?: string;
  createdAt?: string;
}

export interface User {
  id: ID;
  name: string;
  email: string;
  avatarUrl?: string;
  role: AppRole;
  tenantId: ID;
  active: boolean;
  phone?: string;
}

/* ───────── Leads ───────── */

export type LeadStatus =
  | "nuevo"
  | "contactado"
  | "cualificado"
  | "visita_agendada"
  | "visita_realizada"
  | "seguimiento"
  | "oferta"
  | "ganado"
  | "perdido"
  | "descartado";

export type LeadScore = "caliente" | "templado" | "frio" | "descartable";
export type LeadPriority = "alta" | "media" | "baja";
export type LeadChannel = "whatsapp" | "email" | "telefono" | "web" | "portal" | "referido" | "presencial";
export type LeadSource = "idealista" | "fotocasa" | "habitaclia" | "web_propia" | "google_ads" | "meta_ads" | "referido" | "presencial" | "otro";
export type OperationType = "compra" | "alquiler" | "alquiler_temporal" | "traspaso";
export type PropertyType = "piso" | "casa" | "atico" | "duplex" | "estudio" | "local" | "oficina" | "garaje" | "terreno";
export type FinancingStatus = "aprobada" | "pendiente" | "no_aprobada" | "no_necesita";
export type Urgency = "inmediata" | "1_3_meses" | "3_6_meses" | "mas_6_meses";

export interface LeadQualification {
  budgetMin?: number;
  budgetMax?: number;
  financing: FinancingStatus;
  urgency: Urgency;
  operation: OperationType;
  zones: string[];
  propertyTypes: PropertyType[];
  bedrooms?: number;
  bathrooms?: number;
  features: string[];
  profile?: string;
  intent?: string;
  notes?: string;
}

export interface Lead {
  id: ID;
  tenantId: ID;
  name: string;
  email?: string;
  phone?: string;
  channel: LeadChannel;
  source: LeadSource;
  status: LeadStatus;
  priority: LeadPriority;
  score: LeadScore;
  scoreReason?: string;
  assignedTo?: ID;
  propertyOfInterestId?: ID;
  qualification: LeadQualification;
  tags: string[];
  nextAction?: string;
  nextActionAt?: string;
  lastActivityAt: string;
  createdAt: string;
  aiSummary?: string;
  aiNextAction?: string;
}

/* ───────── Properties ───────── */

export type PropertyStatus = "disponible" | "reservado" | "vendido" | "alquilado" | "retirado";

export interface Property {
  id: ID;
  tenantId: ID;
  reference: string;
  title: string;
  type: PropertyType;
  operation: OperationType;
  status: PropertyStatus;
  price: number;
  address: string;
  zone: string;
  city: string;
  surface: number; // m²
  bedrooms: number;
  bathrooms: number;
  description: string;
  features: string[];
  imageUrl?: string;
  agentId: ID;
  createdAt: string;
}

/* ───────── Visits ───────── */

export type VisitStatus = "propuesta" | "confirmada" | "realizada" | "no_show" | "cancelada" | "reagendada";
export type VisitOutcome = "muy_interesado" | "interesado" | "neutral" | "no_interesado" | "ofrece";

export interface Visit {
  id: ID;
  tenantId: ID;
  leadId: ID;
  propertyId: ID;
  agentId: ID;
  scheduledAt: string;
  durationMin: number;
  status: VisitStatus;
  outcome?: VisitOutcome;
  notes?: string;
  createdAt: string;
}

/* ───────── Tasks & Activity ───────── */

export type TaskType = "llamada" | "seguimiento" | "documentacion" | "visita" | "incidencia" | "email" | "whatsapp";
export type TaskStatus = "pendiente" | "en_curso" | "completada" | "vencida" | "cancelada";
export type TaskPriority = "alta" | "media" | "baja";

export interface Task {
  id: ID;
  tenantId: ID;
  type: TaskType;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo: ID;
  leadId?: ID;
  propertyId?: ID;
  visitId?: ID;
  dueAt: string;
  completedAt?: string;
  createdAt: string;
}

export type ActivityType =
  | "lead_created"
  | "lead_status_changed"
  | "lead_assigned"
  | "note_added"
  | "visit_scheduled"
  | "visit_completed"
  | "document_uploaded"
  | "task_completed"
  | "automation_executed";

export interface Activity {
  id: ID;
  tenantId: ID;
  type: ActivityType;
  actorId?: ID;
  leadId?: ID;
  propertyId?: ID;
  message: string;
  meta?: Record<string, unknown>;
  createdAt: string;
}

export interface Note {
  id: ID;
  tenantId: ID;
  leadId?: ID;
  propertyId?: ID;
  authorId: ID;
  content: string;
  createdAt: string;
}

/* ───────── Documents ───────── */

export type DocumentCategory = "contrato" | "reserva" | "nota_simple" | "escritura" | "interno" | "ficha_comercial" | "identidad" | "otro";
export type DocumentStatus = "subido" | "procesando" | "listo" | "error";

export interface DocumentFile {
  id: ID;
  tenantId: ID;
  name: string;
  category: DocumentCategory;
  status: DocumentStatus;
  sizeBytes: number;
  mimeType: string;
  leadId?: ID;
  propertyId?: ID;
  uploadedBy: ID;
  uploadedAt: string;
  summary?: string;
  extractedData?: Record<string, string>;
}

/* ───────── Knowledge ───────── */

export type KnowledgeCategory = "faq" | "proceso" | "argumentario" | "politica" | "respuesta_modelo" | "zona" | "empresa";

export interface KnowledgeArticle {
  id: ID;
  tenantId: ID;
  title: string;
  category: KnowledgeCategory;
  tags: string[];
  contentMd: string;
  version: number;
  authorId: ID;
  createdAt: string;
  updatedAt: string;
}

/* ───────── Automations ───────── */

export type AutomationTrigger =
  | "lead_created"
  | "lead_no_response_24h"
  | "lead_no_response_72h"
  | "visit_completed"
  | "lead_dormant_15d"
  | "document_pending";

export type AutomationStepKind = "wait" | "send_template" | "create_task" | "change_status" | "notify_agent" | "assign_agent";

export interface AutomationStep {
  id: ID;
  kind: AutomationStepKind;
  config: Record<string, unknown>;
}

export interface AutomationRule {
  id: ID;
  tenantId: ID;
  name: string;
  description?: string;
  trigger: AutomationTrigger;
  conditions: { field: string; op: string; value: string }[];
  steps: AutomationStep[];
  enabled: boolean;
  lastRunAt?: string;
  runsCount: number;
  createdAt: string;
}

export interface AutomationRun {
  id: ID;
  ruleId: ID;
  leadId?: ID;
  status: "ok" | "error" | "running";
  startedAt: string;
  finishedAt?: string;
  log: string[];
}

/* ───────── Templates & Integrations ───────── */

export type TemplateChannel = "email" | "whatsapp" | "sms";

export interface Template {
  id: ID;
  tenantId: ID;
  name: string;
  channel: TemplateChannel;
  subject?: string;
  body: string;
  variables: string[];
}

export type IntegrationKind = "whatsapp" | "email" | "crm" | "web_form" | "calendar" | "custom_api";

export interface Integration {
  id: ID;
  tenantId: ID;
  kind: IntegrationKind;
  name: string;
  connected: boolean;
  webhookUrl?: string;
  config?: Record<string, unknown>;
}

export interface Tag {
  id: ID;
  tenantId: ID;
  label: string;
  color: string;
}
