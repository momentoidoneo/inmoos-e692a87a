import type { Template } from "@/modules/types";
import { seedTemplates } from "./mock/seed";
import { demoSeed } from "./demoContent";

export interface TemplatesService {
  list(): Promise<Template[]>;
}

export class MockTemplatesService implements TemplatesService {
  async list() { return demoSeed(seedTemplates); }
}
