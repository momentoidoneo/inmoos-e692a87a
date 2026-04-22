/**
 * Applies the active tenant's primary color to the CSS var --primary at runtime.
 * Expects HSL triple (e.g. "221 83% 53%"). Falls back to the design-system default.
 */
import { useEffect } from "react";
import { useAuth } from "@/app/AuthContext";

const DEFAULT_PRIMARY = "221 83% 53%";

function isValidHsl(v: string): boolean {
  return /^\d{1,3}\s+\d{1,3}%\s+\d{1,3}%$/.test(v.trim());
}

export function useTenantBranding() {
  const { activeTenant } = useAuth();

  useEffect(() => {
    const root = document.documentElement;
    const color = activeTenant?.primary_color?.trim();
    if (color && isValidHsl(color)) {
      root.style.setProperty("--primary", color);
      root.style.setProperty("--ring", color);
    } else {
      root.style.removeProperty("--primary");
      root.style.removeProperty("--ring");
    }
    return () => {
      root.style.removeProperty("--primary");
      root.style.removeProperty("--ring");
    };
  }, [activeTenant?.primary_color]);
}
