import type { Template } from "@/modules/types";
import { seedTemplates } from "./mock/seed";

export interface TemplatesService {
  list(): Promise<Template[]>;
}

export class MockTemplatesService implements TemplatesService {
  async list() { return seedTemplates; }
}
