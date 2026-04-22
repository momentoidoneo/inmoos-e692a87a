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
  | "leads.delete"
  | "worker.manage";

const matrix: Record<Permission, AppRole[]> = {
  "team.view": ["super_admin", "admin", "director", "agente", "backoffice"],
  "team.invite": ["super_admin", "admin", "director"],
  "team.changeRole": ["super_admin", "admin"],
  "team.remove": ["super_admin", "admin"],
  "tenant.update": ["super_admin", "admin"],
  "automations.manage": ["super_admin", "admin", "director"],
  "knowledge.manage": ["super_admin", "admin", "director", "backoffice"],
  "settings.manage": ["super_admin", "admin", "director"],
  "integrations.manage": ["super_admin", "admin", "director"],
  "leads.assign": ["super_admin", "admin", "director"],
  "leads.delete": ["super_admin", "admin"],
  "worker.manage": ["super_admin"],
};

export function usePermissions() {
  const { role } = useAuth();
  return useMemo(() => {
    const can = (perm: Permission): boolean => {
      if (!role) return false;
      return matrix[perm].includes(role);
    };
    return {
      role,
      can,
      isAdmin: role === "admin" || role === "super_admin",
      isDirector: role === "director",
      isSuperAdmin: role === "super_admin",
    };
  }, [role]);
}
