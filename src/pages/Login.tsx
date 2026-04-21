import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen grid place-items-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-lg bg-primary text-primary-foreground grid place-items-center mb-2">
            <Building className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl">InmoOS</CardTitle>
          <CardDescription>Sistema operativo comercial para inmobiliarias</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Email</Label><Input type="email" defaultValue="laura@vertice.es" /></div>
          <div><Label>Contraseña</Label><Input type="password" defaultValue="••••••••" /></div>
          <Button className="w-full" onClick={() => navigate("/")}>Entrar</Button>
          <p className="text-xs text-center text-muted-foreground">Demo · auth multi-tenant lista para Lovable Cloud</p>
        </CardContent>
      </Card>
    </div>
  );
}
