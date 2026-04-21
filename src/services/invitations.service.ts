/**
 * Invitations service — REAL Cloud-backed.
 * Handles tenant invitations CRUD + accept-by-token flow.
 */
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/modules/types";

export interface TenantInvitation {
  id: string;
  tenant_id: string;
  email: string;
  role: AppRole;
  token: string;
  status: "pending" | "accepted" | "cancelled" | "expired";
  invited_by: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface AcceptResult {
  ok: boolean;
  error?: string;
  tenant_id?: string;
}

export const invitationsService = {
  async list(tenantId: string): Promise<TenantInvitation[]> {
    const { data, error } = await supabase
      .from("tenant_invitations")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as TenantInvitation[];
  },

  async create(params: {
    tenantId: string;
    email: string;
    role: AppRole;
    invitedBy: string;
  }): Promise<TenantInvitation> {
    const { data, error } = await supabase
      .from("tenant_invitations")
      .insert({
        tenant_id: params.tenantId,
        email: params.email.trim().toLowerCase(),
        role: params.role,
        invited_by: params.invitedBy,
      })
      .select()
      .single();
    if (error) throw error;
    return data as TenantInvitation;
  },

  async cancel(id: string): Promise<void> {
    const { error } = await supabase
      .from("tenant_invitations")
      .update({ status: "cancelled" })
      .eq("id", id);
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase
      .from("tenant_invitations")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  async accept(token: string): Promise<AcceptResult> {
    const { data, error } = await supabase.rpc("accept_invitation", { _token: token });
    if (error) return { ok: false, error: error.message };
    return data as unknown as AcceptResult;
  },

  /** Build a shareable invitation URL for the current origin. */
  buildInviteLink(token: string): string {
    return `${window.location.origin}/invite/${token}`;
  },
};
