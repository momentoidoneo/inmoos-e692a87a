// Solver de DataDome / hCaptcha vía 2Captcha (https://2captcha.com/).
// Activación: CAPTCHA_PROVIDER=2captcha + CAPTCHA_API_KEY=xxxxx
// Si no están definidos, las funciones devuelven null y el adapter sigue
// (fallará el scrape pero no rompe el worker).

const PROVIDER = process.env.CAPTCHA_PROVIDER ?? "";
const API_KEY = process.env.CAPTCHA_API_KEY ?? "";

export function captchaEnabled(): boolean {
  return PROVIDER === "2captcha" && API_KEY.length > 0;
}

/**
 * Resuelve un captcha DataDome.
 * @param captchaUrl URL del iframe del captcha (la que carga geo.captcha-delivery.com)
 * @param pageUrl URL de la página donde apareció el captcha
 * @param userAgent UA del navegador que lo recibió (debe coincidir)
 * @returns cookie "datadome=..." lista para inyectar, o null si falla
 */
export async function solveDataDome(
  captchaUrl: string,
  pageUrl: string,
  userAgent: string,
): Promise<string | null> {
  if (!captchaEnabled()) return null;

  try {
    // Paso 1: enviar tarea
    const submit = await fetch("https://2captcha.com/in.php", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        key: API_KEY,
        method: "datadome",
        captcha_url: captchaUrl,
        pageurl: pageUrl,
        userAgent,
        json: "1",
      }),
    });
    const submitJson = (await submit.json()) as { status: number; request: string };
    if (submitJson.status !== 1) {
      console.error("[captcha] submit failed", submitJson);
      return null;
    }
    const taskId = submitJson.request;
    console.log("[captcha] submitted task", taskId);

    // Paso 2: poll hasta 120s
    for (let i = 0; i < 24; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      const res = await fetch(
        `https://2captcha.com/res.php?key=${API_KEY}&action=get&id=${taskId}&json=1`,
      );
      const resJson = (await res.json()) as { status: number; request: string };
      if (resJson.status === 1) {
        console.log("[captcha] solved task", taskId);
        return resJson.request; // cookie datadome
      }
      if (resJson.request !== "CAPCHA_NOT_READY") {
        console.error("[captcha] solve error", resJson);
        return null;
      }
    }
    console.error("[captcha] timeout solving", taskId);
    return null;
  } catch (err) {
    console.error("[captcha] exception", err);
    return null;
  }
}
