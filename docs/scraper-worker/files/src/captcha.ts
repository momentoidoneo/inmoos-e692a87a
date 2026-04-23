// Solver de DataDome / hCaptcha vía Anti-Captcha (https://anti-captcha.com/).
// Activación: CAPTCHA_PROVIDER=anticaptcha + CAPTCHA_API_KEY=xxxxx
// Si no están definidos, las funciones devuelven null y el adapter sigue
// (fallará el scrape pero no rompe el worker).

const PROVIDER = process.env.CAPTCHA_PROVIDER ?? "";
const API_KEY = process.env.CAPTCHA_API_KEY ?? "";

export function captchaEnabled(): boolean {
  return PROVIDER === "anticaptcha" && API_KEY.length > 0;
}

/**
 * Resuelve un captcha DataDome con Anti-Captcha.
 * Docs: https://anti-captcha.com/apidoc/task-types/DataDomeSliderTask
 *
 * @param captchaUrl URL del iframe del captcha (geo.captcha-delivery.com/...)
 * @param pageUrl URL de la página donde apareció el captcha
 * @param userAgent UA del navegador que lo recibió (debe coincidir)
 * @param proxy Opcional: proxy a usar para resolver (recomendado, misma IP)
 * @returns cookie "datadome=..." lista para inyectar, o null si falla
 */
export async function solveDataDome(
  captchaUrl: string,
  pageUrl: string,
  userAgent: string,
  proxy?: { host: string; port: number; user?: string; pass?: string },
): Promise<string | null> {
  if (!captchaEnabled()) return null;

  try {
    // Paso 1: crear tarea
    const task: Record<string, any> = {
      type: proxy ? "DataDomeSliderTask" : "DataDomeSliderTaskProxyless",
      websiteURL: pageUrl,
      captchaUrl,
      userAgent,
    };
    if (proxy) {
      task.proxyType = "http";
      task.proxyAddress = proxy.host;
      task.proxyPort = proxy.port;
      if (proxy.user) task.proxyLogin = proxy.user;
      if (proxy.pass) task.proxyPassword = proxy.pass;
    }

    const createRes = await fetch("https://api.anti-captcha.com/createTask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientKey: API_KEY, task }),
    });
    const createJson = (await createRes.json()) as {
      errorId: number;
      errorCode?: string;
      errorDescription?: string;
      taskId?: number;
    };
    if (createJson.errorId !== 0 || !createJson.taskId) {
      console.error("[captcha] createTask failed", createJson);
      return null;
    }
    const taskId = createJson.taskId;
    console.log("[captcha] submitted task", taskId);

    // Paso 2: poll hasta 120s (cada 5s)
    for (let i = 0; i < 24; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      const res = await fetch("https://api.anti-captcha.com/getTaskResult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientKey: API_KEY, taskId }),
      });
      const resJson = (await res.json()) as {
        errorId: number;
        status?: "processing" | "ready";
        solution?: { cookie?: string; gRecaptchaResponse?: string };
        errorCode?: string;
        errorDescription?: string;
      };
      if (resJson.errorId !== 0) {
        console.error("[captcha] getTaskResult error", resJson);
        return null;
      }
      if (resJson.status === "ready") {
        const cookie = resJson.solution?.cookie ?? null;
        if (!cookie) {
          console.error("[captcha] solution missing cookie", resJson);
          return null;
        }
        console.log("[captcha] solved task", taskId);
        // Anti-Captcha devuelve "datadome=XYZ" → extraemos solo el valor
        const match = cookie.match(/datadome=([^;]+)/i);
        return match ? match[1] : cookie;
      }
      // status === "processing" → seguir esperando
    }
    console.error("[captcha] timeout solving", taskId);
    return null;
  } catch (err) {
    console.error("[captcha] exception", err);
    return null;
  }
}
