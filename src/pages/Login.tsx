import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Building2, Loader2 } from "lucide-react";
import { useAuth } from "@/app/AuthContext";
import { toast } from "@/hooks/use-toast";

export default function Login() {
  const navigate = useNavigate();
  const { user, signIn, signUp, loading } = useAuth();
  const [busy, setBusy] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPwd, setLoginPwd] = useState("");

  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPwd, setSignupPwd] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await signIn(loginEmail, loginPwd);
    setBusy(false);
    if (error) {
      toast({ title: "No se pudo iniciar sesión", description: error.message, variant: "destructive" });
    } else {
      navigate("/", { replace: true });
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await signUp(signupEmail, signupPwd, signupName);
    setBusy(false);
    if (error) {
      toast({ title: "No se pudo registrar", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "Cuenta creada",
        description: "Revisa tu correo si la verificación está activada y vuelve a iniciar sesión.",
      });
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Brand panel */}
      <aside className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-primary/10 via-primary/5 to-background border-r">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground grid place-items-center">
            <Building2 className="h-5 w-5" />
          </div>
          InmoOS
        </Link>
        <div className="space-y-4 max-w-md">
          <h1 className="text-3xl font-semibold leading-tight">
            El sistema operativo comercial de tu inmobiliaria.
          </h1>
          <p className="text-muted-foreground">
            Convierte más leads en visitas, más visitas en operaciones y reduce el trabajo
            administrativo de tu equipo.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} InmoOS</p>
      </aside>

      {/* Auth form */}
      <main className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md border-0 shadow-none lg:border lg:shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Bienvenido</CardTitle>
            <CardDescription>Accede a tu espacio o crea una cuenta nueva.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
                <TabsTrigger value="signup">Crear cuenta</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-pwd">Contraseña</Label>
                    <Input
                      id="login-pwd"
                      type="password"
                      autoComplete="current-password"
                      value={loginPwd}
                      onChange={(e) => setLoginPwd(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Entrar
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="su-name">Nombre completo</Label>
                    <Input
                      id="su-name"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-email">Email</Label>
                    <Input
                      id="su-email"
                      type="email"
                      autoComplete="email"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-pwd">Contraseña</Label>
                    <Input
                      id="su-pwd"
                      type="password"
                      autoComplete="new-password"
                      value={signupPwd}
                      onChange={(e) => setSignupPwd(e.target.value)}
                      minLength={6}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Crear cuenta
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Al continuar aceptas los términos del servicio.
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
