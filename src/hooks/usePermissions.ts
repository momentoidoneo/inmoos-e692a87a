/**
 * Role-based gating helpers.
 *
 * Usage:
 *   const { can } = usePermissions();
 *   if (can("team.invite")) { ... }
 *
 * Roles hierarchy (least → most powerful):
 *   backoffice  →  agente  →  director  →  admin
 *
 * Permissions are coarse-grained on purpose; refine as the product grows.
 */
import { useMemo } from "react";
import { useAuth, type AppRole } from "@/app/AuthContext";

export type Permission =
  | "team.view"
  | "team.invite"
  | "team.changeRole"
  | "team.remove"
  | "tenant.update"
  | "automations.manage"
  | "knowledge.manage"
  | "settings.manage"
  | "integrations.manage"
  | "leads.assign"
  | "leads.delete";

const matrix: Record<Permission, AppRole[]> = {
  "team.view": ["admin", "director", "agente", "backoffice"],
  "team.invite": ["admin", "director"],
  "team.changeRole": ["admin"],
  "team.remove": ["admin"],
  "tenant.update": ["admin"],
  "automations.manage": ["admin", "director"],
  "knowledge.manage": ["admin", "director", "backoffice"],
  "settings.manage": ["admin", "director"],
  "integrations.manage": ["admin", "director"],
  "leads.assign": ["admin", "director"],
  "leads.delete": ["admin"],
};

export function usePermissions() {
  const { role } = useAuth();
  return useMemo(() => {
    const can = (perm: Permission): boolean => {
      if (!role) return false;
      return matrix[perm].includes(role);
    };
    return { role, can, isAdmin: role === "admin", isDirector: role === "director" };
  }, [role]);
}
