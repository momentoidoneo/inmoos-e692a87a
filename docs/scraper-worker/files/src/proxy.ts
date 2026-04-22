// Genera la configuración de proxy para Playwright. Soporta sesiones "sticky"
// por sessionId (importante para que el mismo IP visite varias páginas de un
// portal y parezca una sesión humana real).

export interface ProxyConfig {
  server: string;
  username?: string;
  password?: string;
}

const provider = process.env.PROXY_PROVIDER ?? "custom";
const host = process.env.PROXY_HOST ?? "";
const user = process.env.PROXY_USER ?? "";
const pass = process.env.PROXY_PASS ?? "";
const country = process.env.PROXY_COUNTRY ?? "es";

export function getProxy(sessionId: string): ProxyConfig | undefined {
  if (!host) return undefined;

  // Bright Data: user puede llevar parámetros estilo brd-customer-XXX-zone-YYY-country-es-session-ZZZ
  if (provider === "brightdata" && user) {
    return {
      server: `http://${host}`,
      username: `${user}-country-${country}-session-${sessionId}`,
      password: pass,
    };
  }

  // Smartproxy / Decodo / IPRoyal usan típicamente user-session-XXX
  if ((provider === "smartproxy" || provider === "iproyal") && user) {
    return {
      server: `http://${host}`,
      username: `${user}-session-${sessionId}`,
      password: pass,
    };
  }

  return { server: `http://${host}`, username: user || undefined, password: pass || undefined };
}
