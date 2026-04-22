import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Search, Moon, Sun, Bell, LogOut, Check, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { useEffect, useMemo, useState } from "react";
import { services } from "@/services";
import type { Lead } from "@/modules/types";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "./AuthContext";
import { useTenantBranding } from "@/hooks/useTenantBranding";

const breadcrumbMap: Record<string, string> = {
  "": "Dashboard",
  leads: "Leads",
  agenda: "Agenda",
  inmuebles: "Inmuebles",
  tareas: "Tareas",
  actividad: "Actividad",
  automatizaciones: "Automatizaciones",
  documentos: "Documentos",
  conocimiento: "Base de conocimiento",
  equipo: "Equipo",
  integraciones: "Integraciones",
  configuracion: "Configuración",
  perfil: "Perfil",
};

export function AppShell() {
  const { theme, toggle } = useTheme();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const { activeTenant, tenants, switchTenant, signOut, profile, user } = useAuth();
  useTenantBranding();

  const initials = useMemo(() => {
    const src = profile?.full_name ?? user?.email ?? "?";
    return src
      .split(/\s+/)
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }, [profile, user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  useEffect(() => { services.leads.list().then(setLeads); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setCmdOpen((o) => !o); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const crumbs = useMemo(() => {
    const segs = pathname.split("/").filter(Boolean);
    if (segs.length === 0) return ["Dashboard"];
    const out = [breadcrumbMap[segs[0]] ?? segs[0]];
    if (segs.length > 1) out.push("Detalle");
    return out;
  }, [pathname]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b bg-surface flex items-center gap-3 px-4 sticky top-0 z-30">
            <SidebarTrigger />
            <nav aria-label="Breadcrumb" className="hidden md:flex items-center gap-1.5 text-sm text-muted-foreground">
              {crumbs.map((c, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-muted-foreground/50">/</span>}
                  <span className={i === crumbs.length - 1 ? "text-foreground font-medium" : ""}>{c}</span>
                </span>
              ))}
            </nav>
            <div className="flex-1" />
            <button
              onClick={() => setCmdOpen(true)}
              className="hidden md:flex items-center gap-2 h-9 w-72 rounded-md border bg-background px-3 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              <Search className="h-4 w-4" />
              <span>Buscar leads, inmuebles…</span>
              <kbd className="ml-auto text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">⌘K</kbd>
            </button>
            <Button variant="ghost" size="icon" aria-label="Notificaciones">
              <Bell className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Cambiar tema">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {/* Tenant switcher */}
            {tenants.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="hidden md:flex gap-2 max-w-[180px]">
                    <Building2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{activeTenant?.name ?? "Inmobiliaria"}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Inmobiliarias</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {tenants.map((t) => (
                    <DropdownMenuItem key={t.id} onClick={() => switchTenant(t.id)}>
                      <span className="flex-1 truncate">{t.name}</span>
                      {t.id === activeTenant?.id && <Check className="h-3.5 w-3.5 ml-2" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full" aria-label="Cuenta">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-0.5">
                    <p className="text-sm font-medium truncate">{profile?.full_name ?? user?.email}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/perfil")}>Perfil</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/configuracion")}>Configuración</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                  <LogOut className="h-3.5 w-3.5 mr-2" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>

      <CommandDialog open={cmdOpen} onOpenChange={setCmdOpen}>
        <CommandInput placeholder="Buscar leads, inmuebles, páginas…" />
        <CommandList>
          <CommandEmpty>Sin resultados.</CommandEmpty>
          <CommandGroup heading="Páginas">
            {Object.entries(breadcrumbMap).map(([k, v]) => (
              <CommandItem key={k} onSelect={() => { navigate(`/${k}`); setCmdOpen(false); }}>{v}</CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Leads">
            {leads.slice(0, 8).map((l) => (
              <CommandItem key={l.id} onSelect={() => { navigate(`/leads/${l.id}`); setCmdOpen(false); }}>
                {l.name} <span className="ml-2 text-xs text-muted-foreground">{l.email}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </SidebarProvider>
  );
}
