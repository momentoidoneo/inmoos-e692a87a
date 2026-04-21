import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Inbox, Calendar, Building2, FileText, BookOpen,
  Zap, ListChecks, Activity, Users, Settings, Plug, User, Building,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { useApp } from "@/app/AppContext";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { roleLabel } from "@/lib/labels";

const groups = [
  {
    label: "Comercial",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard },
      { title: "Leads", url: "/leads", icon: Inbox },
      { title: "Agenda", url: "/agenda", icon: Calendar },
      { title: "Inmuebles", url: "/inmuebles", icon: Building2 },
      { title: "Tareas", url: "/tareas", icon: ListChecks },
      { title: "Actividad", url: "/actividad", icon: Activity },
    ],
  },
  {
    label: "Inteligencia",
    items: [
      { title: "Automatizaciones", url: "/automatizaciones", icon: Zap },
      { title: "Documentos", url: "/documentos", icon: FileText },
      { title: "Conocimiento", url: "/conocimiento", icon: BookOpen },
    ],
  },
  {
    label: "Administración",
    items: [
      { title: "Equipo", url: "/equipo", icon: Users },
      { title: "Integraciones", url: "/integraciones", icon: Plug },
      { title: "Configuración", url: "/configuracion", icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { tenant, user } = useApp();
  const { pathname } = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="h-8 w-8 rounded-md bg-primary text-primary-foreground grid place-items-center shrink-0">
            <Building className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">InmoOS</p>
              <p className="text-xs text-muted-foreground truncate">{tenant.name}</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            {!collapsed && <SidebarGroupLabel>{g.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((item) => {
                  const isActive = item.url === "/" ? pathname === "/" : pathname.startsWith(item.url);
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                        <NavLink to={item.url} end={item.url === "/"}>
                          <item.icon />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t">
        <NavLink to="/perfil" className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-sidebar-accent">
          <UserAvatar name={user.name} size={28} />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{roleLabel[user.role]}</p>
            </div>
          )}
        </NavLink>
      </SidebarFooter>
    </Sidebar>
  );
}
