import type { Lead, LeadScore } from "@/modules/types";

export interface AIService {
  /** Returns score + textual reason. MOCK — deterministic rules; replace with backend ML. */
  scoreLead(lead: Lead): Promise<{ score: LeadScore; reason: string }>;
  summarizeLead(lead: Lead): Promise<string>;
  recommendNextAction(lead: Lead): Promise<string>;
}

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));

export class MockAIService implements AIService {
  // MOCK — replace with POST /ai/score-lead
  async scoreLead(lead: Lead) {
    await delay();
    let pts = 0;
    if (lead.qualification.financing === "aprobada") pts += 3;
    if (lead.qualification.financing === "pendiente") pts += 1;
    if (lead.qualification.urgency === "inmediata") pts += 3;
    if (lead.qualification.urgency === "1_3_meses") pts += 2;
    if ((lead.qualification.budgetMax ?? 0) > 200000) pts += 2;
    if (lead.priority === "alta") pts += 1;

    const score: LeadScore = pts >= 7 ? "caliente" : pts >= 4 ? "templado" : pts >= 2 ? "frio" : "descartable";
    const reason =
      score === "caliente" ? "Financiación aprobada, urgencia inmediata y presupuesto sólido. Atender hoy."
      : score === "templado" ? "Buena intención y zona definida. Falta confirmar financiación o reducir incertidumbre."
      : score === "frio" ? "Datos parciales, urgencia diferida o presupuesto ajustado. Mantener nutrición."
      : "Datos insuficientes o expectativas fuera de mercado. Cualificar antes de invertir tiempo comercial.";
    return { score, reason };
  }
  async summarizeLead(lead: Lead) {
    await delay();
    return lead.aiSummary ?? `${lead.name} busca ${lead.qualification.operation} en ${lead.qualification.zones.join(", ")}.`;
  }
  async recommendNextAction(lead: Lead) {
    await delay();
    return lead.aiNextAction ?? "Contactar y cualificar.";
  }
}
