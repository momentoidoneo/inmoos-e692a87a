/**
 * Service layer entry point.
 *
 * Core CRM modules (leads, properties, visits, tasks) are backed by Supabase.
 * Other domains stay mock until the FastAPI backend exposes them.
 */
import { LeadsService } from "./leads.service";
import { PropertiesService } from "./properties.service";
import { VisitsService } from "./visits.service";
import { TasksService } from "./tasks.service";
import { DocumentsService, MockDocumentsService } from "./documents.service";
import { KnowledgeService, MockKnowledgeService } from "./knowledge.service";
import { AutomationsService, MockAutomationsService } from "./automations.service";
import { AIService, MockAIService } from "./ai.service";
import { TeamService, MockTeamService } from "./team.service";
import { TemplatesService, MockTemplatesService } from "./templates.service";
import { IntegrationsService, MockIntegrationsService } from "./integrations.service";
import { ActivityService, MockActivityService } from "./activity.service";
import { DashboardService, SupabaseDashboardService } from "./dashboard.service";

import { SupabaseLeadsService } from "./supabase/leads.supabase";
import { SupabasePropertiesService } from "./supabase/properties.supabase";
import { SupabaseVisitsService } from "./supabase/visits.supabase";
import { SupabaseTasksService } from "./supabase/tasks.supabase";

export const services = {
  leads: new SupabaseLeadsService() as LeadsService,
  properties: new SupabasePropertiesService() as PropertiesService,
  visits: new SupabaseVisitsService() as VisitsService,
  tasks: new SupabaseTasksService() as TasksService,
  documents: new MockDocumentsService() as DocumentsService,
  knowledge: new MockKnowledgeService() as KnowledgeService,
  automations: new MockAutomationsService() as AutomationsService,
  ai: new MockAIService() as AIService,
  team: new MockTeamService() as TeamService,
  templates: new MockTemplatesService() as TemplatesService,
  integrations: new MockIntegrationsService() as IntegrationsService,
  activity: new MockActivityService() as ActivityService,
  dashboard: new SupabaseDashboardService() as DashboardService,
};

export const isUsingRealApi = true;
