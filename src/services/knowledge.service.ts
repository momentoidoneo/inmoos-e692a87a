import type { KnowledgeArticle, ID } from "@/modules/types";
import { seedKnowledge } from "./mock/seed";

export interface KnowledgeService {
  list(filters?: Partial<{ category: string; search: string }>): Promise<KnowledgeArticle[]>;
  get(id: ID): Promise<KnowledgeArticle | null>;
  upsert(article: Partial<KnowledgeArticle> & { id?: ID; title: string; contentMd: string; category: KnowledgeArticle["category"] }): Promise<KnowledgeArticle>;
  remove(id: ID): Promise<void>;
  /** Semantic search. MOCK — replace with Qdrant endpoint. */
  semanticSearch(query: string): Promise<KnowledgeArticle[]>;
}

const delay = (ms = 150) => new Promise((r) => setTimeout(r, ms));

export class MockKnowledgeService implements KnowledgeService {
  private items: KnowledgeArticle[] = [...seedKnowledge];
  async list(filters?: { category?: string; search?: string }) {
    await delay();
    let r = this.items;
    if (filters?.category) r = r.filter((k) => k.category === filters.category);
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      r = r.filter((k) => k.title.toLowerCase().includes(q) || k.contentMd.toLowerCase().includes(q) || k.tags.some((t) => t.includes(q)));
    }
    return r;
  }
  async get(id: ID) { await delay(80); return this.items.find((k) => k.id === id) ?? null; }
  async upsert(article: Partial<KnowledgeArticle> & { id?: ID; title: string; contentMd: string; category: KnowledgeArticle["category"] }) {
    await delay();
    const now = new Date().toISOString();
    if (article.id) {
      this.items = this.items.map((k) => k.id === article.id ? { ...k, ...article, version: k.version + 1, updatedAt: now } as KnowledgeArticle : k);
      return this.items.find((k) => k.id === article.id)!;
    }
    const newItem: KnowledgeArticle = {
      id: `kn-${Date.now()}`, tenantId: "tenant-1", title: article.title, contentMd: article.contentMd,
      category: article.category, tags: article.tags ?? [], version: 1, authorId: article.authorId ?? "u-1",
      createdAt: now, updatedAt: now,
    };
    this.items.unshift(newItem);
    return newItem;
  }
  async remove(id: ID) { await delay(); this.items = this.items.filter((k) => k.id !== id); }
  // MOCK — replace with semantic search via Qdrant
  async semanticSearch(query: string) { return this.list({ search: query }); }
}
