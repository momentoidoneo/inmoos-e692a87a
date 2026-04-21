/**
 * Conditionally render children based on a permission.
 * Use for hiding UI affordances the current role can't act on.
 */
import type { ReactNode } from "react";
import { usePermissions, type Permission } from "@/hooks/usePermissions";

interface Props {
  permission: Permission;
  fallback?: ReactNode;
  children: ReactNode;
}

export function RoleGate({ permission, fallback = null, children }: Props) {
  const { can } = usePermissions();
  return <>{can(permission) ? children : fallback}</>;
}
