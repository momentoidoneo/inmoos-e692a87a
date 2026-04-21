import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/app/AppContext";
import { AppShell } from "@/app/AppShell";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import LeadDetail from "./pages/LeadDetail";
import Agenda from "./pages/Agenda";
import Properties from "./pages/Properties";
import PropertyDetail from "./pages/PropertyDetail";
import Tasks from "./pages/Tasks";
import ActivityPage from "./pages/Activity";
import Automations from "./pages/Automations";
import Documents from "./pages/Documents";
import Knowledge from "./pages/Knowledge";
import Team from "./pages/Team";
import Integrations from "./pages/Integrations";
import SettingsPage from "./pages/Settings";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<AppShell />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/leads" element={<Leads />} />
              <Route path="/leads/:id" element={<LeadDetail />} />
              <Route path="/agenda" element={<Agenda />} />
              <Route path="/inmuebles" element={<Properties />} />
              <Route path="/inmuebles/:id" element={<PropertyDetail />} />
              <Route path="/tareas" element={<Tasks />} />
              <Route path="/actividad" element={<ActivityPage />} />
              <Route path="/automatizaciones" element={<Automations />} />
              <Route path="/documentos" element={<Documents />} />
              <Route path="/conocimiento" element={<Knowledge />} />
              <Route path="/equipo" element={<Team />} />
              <Route path="/integraciones" element={<Integrations />} />
              <Route path="/configuracion" element={<SettingsPage />} />
              <Route path="/perfil" element={<Profile />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
