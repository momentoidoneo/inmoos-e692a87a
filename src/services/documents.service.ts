import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import type { DocumentCategory, DocumentFile, DocumentStatus, ID } from "@/modules/types";
import { seedDocuments } from "./mock/seed";
import { demoSeed } from "./demoContent";

export interface DocumentsService {
  list(filters?: Partial<{ leadId: ID; propertyId: ID; category: string }>): Promise<DocumentFile[]>;
  get(id: ID): Promise<DocumentFile | null>;
  upload(file: File, meta: { category: DocumentFile["category"]; leadId?: ID; propertyId?: ID; uploadedBy: ID }): Promise<DocumentFile>;
  ask(documentId: ID, question: string): Promise<string>;
  getDownloadUrl(id: ID): Promise<string>;
}

type DbDocument = Database["public"]["Tables"]["documents"]["Row"];

const TENANT_KEY = "inmoos.activeTenantId";
const DOCUMENTS_BUCKET = "documents";
const tenantId = () => localStorage.getItem(TENANT_KEY) ?? "";
const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

const categories: DocumentCategory[] = ["contrato", "reserva", "nota_simple", "escritura", "interno", "ficha_comercial", "identidad", "otro"];
const statuses: DocumentStatus[] = ["subido", "procesando", "listo", "error"];

function asRecord(value: Json | null): Record<string, string> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, item == null ? "" : String(item)]),
  );
}

function fromDb(row: DbDocument): DocumentFile {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    category: categories.includes(row.category as DocumentCategory) ? row.category as DocumentCategory : "otro",
    status: statuses.includes(row.status as DocumentStatus) ? row.status as DocumentStatus : "subido",
    sizeBytes: row.size_bytes,
    mimeType: row.mime_type,
    leadId: row.lead_id ?? undefined,
    propertyId: row.property_id ?? undefined,
    uploadedBy: row.uploaded_by,
    uploadedAt: row.created_at,
    storagePath: row.storage_path,
    summary: row.summary ?? undefined,
    extractedData: asRecord(row.extracted_data),
    contentText: row.content_text ?? undefined,
  };
}

function sanitizeFileName(name: string): string {
  const cleaned = name.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "documento";
}

function canExtractText(file: File): boolean {
  const lowerName = file.name.toLowerCase();
  return file.type.startsWith("text/")
    || ["json", "csv", "md", "txt", "xml", "html", "log"].some((ext) => lowerName.endsWith(`.${ext}`));
}

async function readContentText(file: File): Promise<string | null> {
  if (!canExtractText(file)) return null;
  const text = await file.text();
  return text.slice(0, 180000);
}

function extractData(text: string | null, file: File): Record<string, string> {
  const data: Record<string, string> = {
    "Archivo": file.name,
    "Tamaño": `${Math.round(file.size / 1024)} KB`,
  };
  if (!text) return data;

  const date = text.match(/\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})\b/);
  const money = text.match(/\b\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})?\s?€\b/);
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const phone = text.match(/(?:\+34\s?)?(?:\d[\s-]?){9,}/);

  if (date) data["Fecha detectada"] = date[0];
  if (money) data["Importe detectado"] = money[0];
  if (email) data["Email detectado"] = email[0];
  if (phone) data["Teléfono detectado"] = phone[0].trim();

  return data;
}

function summarize(file: File, text: string | null): string {
  if (!text) {
    return "Documento subido correctamente. La extracción de texto estará disponible para PDF/DOCX cuando se conecte el procesador OCR/RAG.";
  }
  const compact = text.replace(/\s+/g, " ").trim();
  if (!compact) return "Documento de texto subido, sin contenido legible.";
  return compact.length > 450 ? `${compact.slice(0, 450)}...` : compact;
}

function answerFromText(doc: DocumentFile, question: string): string {
  const text = doc.contentText?.replace(/\s+/g, " ").trim();
  if (!text) {
    const details = doc.extractedData
      ? Object.entries(doc.extractedData).map(([key, value]) => `${key}: ${value}`).join(" · ")
      : "sin datos extraídos";
    return `No hay texto indexado para este archivo. Puedo ver la ficha del documento: ${details}.`;
  }

  const terms = question.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 3);

  const normalizedText = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const sentences = text.split(/(?<=[.!?])\s+|\n+/).filter(Boolean);
  const matches = sentences
    .filter((sentence) => {
      const normalizedSentence = sentence.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return terms.some((term) => normalizedSentence.includes(term));
    })
    .slice(0, 3);

  if (matches.length > 0) {
    return `He encontrado esto en el documento: ${matches.join(" ")}`;
  }

  const firstTerm = terms[0];
  if (firstTerm) {
    const index = normalizedText.indexOf(firstTerm);
    if (index >= 0) {
      return `Fragmento relacionado: ${text.slice(Math.max(0, index - 180), index + 420)}`;
    }
  }

  return "No he encontrado una coincidencia clara en el texto indexado. Prueba con una pregunta más concreta o con una palabra exacta del documento.";
}

export class SupabaseDocumentsService implements DocumentsService {
  async list(filters?: { leadId?: ID; propertyId?: ID; category?: string }) {
    const tid = tenantId();
    if (!tid) return [];
    let query = supabase
      .from("documents")
      .select("*")
      .eq("tenant_id", tid)
      .order("created_at", { ascending: false });

    if (filters?.leadId) query = query.eq("lead_id", filters.leadId);
    if (filters?.propertyId) query = query.eq("property_id", filters.propertyId);
    if (filters?.category) query = query.eq("category", filters.category);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map((row) => fromDb(row));
  }

  async get(id: ID) {
    const tid = tenantId();
    if (!tid) return null;
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("tenant_id", tid)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? fromDb(data) : null;
  }

  async upload(file: File, meta: { category: DocumentFile["category"]; leadId?: ID; propertyId?: ID; uploadedBy: ID }) {
    const tid = tenantId();
    if (!tid) throw new Error("Tenant activo no encontrado");

    const docId = crypto.randomUUID();
    const storagePath = `${tid}/${docId}/${sanitizeFileName(file.name)}`;
    const contentText = await readContentText(file);
    const extractedData = extractData(contentText, file);
    const mimeType = file.type || "application/octet-stream";

    const upload = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .upload(storagePath, file, { contentType: mimeType, upsert: false });
    if (upload.error) throw upload.error;

    const payload = {
      id: docId,
      tenant_id: tid,
      name: file.name,
      category: meta.category,
      status: "listo",
      size_bytes: file.size,
      mime_type: mimeType,
      lead_id: meta.leadId ?? null,
      property_id: meta.propertyId ?? null,
      uploaded_by: meta.uploadedBy,
      storage_path: storagePath,
      summary: summarize(file, contentText),
      extracted_data: extractedData as Json,
      content_text: contentText,
    };

    const { data, error } = await supabase.from("documents").insert(payload).select("*").single();
    if (error) {
      await supabase.storage.from(DOCUMENTS_BUCKET).remove([storagePath]);
      throw error;
    }

    if (meta.leadId) {
      await supabase.from("lead_activity").insert({
        tenant_id: tid,
        lead_id: meta.leadId,
        type: "document_uploaded",
        payload: { documentId: docId, name: file.name, category: meta.category },
        created_by: meta.uploadedBy,
      });
    }

    return fromDb(data);
  }

  async ask(documentId: ID, question: string) {
    await delay(150);
    const doc = await this.get(documentId);
    if (!doc) throw new Error("Documento no encontrado");
    return answerFromText(doc, question);
  }

  async getDownloadUrl(id: ID) {
    const doc = await this.get(id);
    if (!doc?.storagePath) throw new Error("Archivo no encontrado");
    const { data, error } = await supabase.storage.from(DOCUMENTS_BUCKET).createSignedUrl(doc.storagePath, 600);
    if (error) throw error;
    return data.signedUrl;
  }
}

export class MockDocumentsService implements DocumentsService {
  private docs: DocumentFile[] = demoSeed(seedDocuments);
  async list(filters?: { leadId?: ID; propertyId?: ID; category?: string }) {
    await delay();
    let r = this.docs;
    if (filters?.leadId) r = r.filter((d) => d.leadId === filters.leadId);
    if (filters?.propertyId) r = r.filter((d) => d.propertyId === filters.propertyId);
    if (filters?.category) r = r.filter((d) => d.category === filters.category);
    return r;
  }
  async get(id: ID) { await delay(80); return this.docs.find((d) => d.id === id) ?? null; }
  async upload(file: File, meta: { category: DocumentFile["category"]; leadId?: ID; propertyId?: ID; uploadedBy: ID }) {
    await delay(400);
    const contentText = await readContentText(file);
    const doc: DocumentFile = {
      id: `doc-${Date.now()}`, tenantId: "", name: file.name, category: meta.category,
      status: "listo", sizeBytes: file.size, mimeType: file.type || "application/octet-stream",
      leadId: meta.leadId, propertyId: meta.propertyId, uploadedBy: meta.uploadedBy,
      uploadedAt: new Date().toISOString(), contentText, extractedData: extractData(contentText, file),
      summary: summarize(file, contentText),
    };
    this.docs.unshift(doc);
    return doc;
  }
  async ask(documentId: ID, question: string) {
    await delay(300);
    const doc = await this.get(documentId);
    if (!doc) throw new Error("Documento no encontrado");
    return answerFromText(doc, question);
  }
  async getDownloadUrl() {
    await delay(80);
    return "#";
  }
}
