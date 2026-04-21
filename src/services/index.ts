/**
 * Service layer entry point.
 *
 * Each domain has an interface + a mock implementation + a REST stub.
 * Switching to the real backend = changing the export below.
 *
 *    import.meta.env.VITE_USE_REAL_API === "true"  →  REST adapters
 *    otherwise                                    →  in-memory mock
 */
import { LeadsService, MockLeadsService } from "./leads.service";
import { PropertiesService, MockPropertiesService } from "./properties.service";
import { VisitsService, MockVisitsService } from "./visits.service";
import { TasksService, MockTasksService } from "./tasks.service";
import { DocumentsService, MockDocumentsService } from "./documents.service";
import { KnowledgeService, MockKnowledgeService } from "./knowledge.service";
import { AutomationsService, MockAutomationsService } from "./automations.service";
import { AIService, MockAIService } from "./ai.service";
import { TeamService, MockTeamService } from "./team.service";
import { TemplatesService, MockTemplatesService } from "./templates.service";
import { IntegrationsService, MockIntegrationsService } from "./integrations.service";
import { ActivityService, MockActivityService } from "./activity.service";
import { DashboardService, MockDashboardService } from "./dashboard.service";

const useReal = import.meta.env.VITE_USE_REAL_API === "true";

export const services = {
  leads: new MockLeadsService() as LeadsService,
  properties: new MockPropertiesService() as PropertiesService,
  visits: new MockVisitsService() as VisitsService,
  tasks: new MockTasksService() as TasksService,
  documents: new MockDocumentsService() as DocumentsService,
  knowledge: new MockKnowledgeService() as KnowledgeService,
  automations: new MockAutomationsService() as AutomationsService,
  ai: new MockAIService() as AIService,
  team: new MockTeamService() as TeamService,
  templates: new MockTemplatesService() as TemplatesService,
  integrations: new MockIntegrationsService() as IntegrationsService,
  activity: new MockActivityService() as ActivityService,
  dashboard: new MockDashboardService() as DashboardService,
};

export const isUsingRealApi = useReal;
