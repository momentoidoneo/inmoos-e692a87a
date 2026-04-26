import type { DocumentFile, ID } from "@/modules/types";
import { seedDocuments } from "./mock/seed";
import { demoSeed } from "./demoContent";

export interface DocumentsService {
  list(filters?: Partial<{ leadId: ID; propertyId: ID; category: string }>): Promise<DocumentFile[]>;
  get(id: ID): Promise<DocumentFile | null>;
  upload(file: File, meta: { category: DocumentFile["category"]; leadId?: ID; propertyId?: ID; uploadedBy: ID }): Promise<DocumentFile>;
  /** Q&A over a document. MOCK — replace with RAG endpoint. */
  ask(documentId: ID, question: string): Promise<string>;
}

const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

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
    const doc: DocumentFile = {
      id: `doc-${Date.now()}`, tenantId: "", name: file.name, category: meta.category,
      status: "procesando", sizeBytes: file.size, mimeType: file.type,
      leadId: meta.leadId, propertyId: meta.propertyId, uploadedBy: meta.uploadedBy,
      uploadedAt: new Date().toISOString(),
    };
    this.docs.unshift(doc);
    // simulate async processing
    setTimeout(() => { doc.status = "listo"; doc.summary = "Documento procesado correctamente."; }, 3000);
    return doc;
  }
  // MOCK — replace with RAG endpoint POST /documents/{id}/ask
  async ask(_documentId: ID, question: string) {
    await delay(800);
    return `Según el documento: "${question}" — Respuesta generada por IA. Conecta tu backend RAG (Qdrant + OpenClaw) para respuestas reales.`;
  }
}
