# Coolify — Setup detallado para el worker de InmoOS

## 1. Instalar Coolify (una vez por servidor)

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | sudo bash
```

Accede a `http://<ip-servidor>:8000`, crea cuenta admin y configura tu dominio
(ej. `coolify.tudominio.com`) con HTTPS automático.

## 2. Crear el proyecto

1. Coolify → **Projects** → **+ Add** → nombre: `inmoos`.
2. Dentro del proyecto → **+ New Resource** → **Application**.
3. **Source:** Public/Private Git Repository → URL del repo del worker.
4. **Build Pack:** `Dockerfile`.
5. **Branch:** `main`.
6. **Port:** `3000`.
7. **Domains:** `scraper.tudominio.com` (Coolify pide A record DNS apuntando al server).
8. **Environment Variables:** pega las de `.env.example` con valores reales.
9. **Deploy**.

## 3. Añadir Redis

1. Mismo proyecto → **+ New Resource** → **Database** → **Redis**.
2. Versión: 7.
3. Coolify lo expone internamente como `redis://redis:6379`.

## 4. Generar token de API

1. Avatar arriba derecha → **Keys & Tokens** → **API Tokens** → **Create New Token**.
2. Nombre: `lovable-inmoos`.
3. Permissions: marca **read** + **write** + **deploy**.
4. Copia el token (empieza por `1|...`). **No se vuelve a mostrar.**

## 5. Obtener el UUID de la Application

1. Abre la app del worker en Coolify.
2. Mira la URL: `https://coolify.tudominio.com/project/<proj-uuid>/environment/.../application/<APP-UUID>`.
3. El UUID de la app es el último segmento.

## 6. Webhook de redespliegue automático

Lovable usará el endpoint:
```
POST https://coolify.tudominio.com/api/v1/applications/<APP-UUID>/restart
Authorization: Bearer <coolify-token>
```

Para redeploys completos (cuando cambias env vars):
```
POST https://coolify.tudominio.com/api/v1/applications/<APP-UUID>/deploy
Authorization: Bearer <coolify-token>
```

Y para inyectar nuevas variables:
```
PATCH https://coolify.tudominio.com/api/v1/applications/<APP-UUID>/envs
Authorization: Bearer <coolify-token>
Content-Type: application/json

{ "key": "PROXY_PASS", "value": "...", "is_preview": false }
```

Estos tres calls son los que la Edge Function `worker-provision` ejecutará desde
Lovable cuando pulses **Desplegar / Redesplegar / Reiniciar** en la UI.

## 7. Logs y debugging

- Coolify → tu app → **Logs** (real-time, últimas 1000 líneas).
- También vía API:
  ```
  GET https://coolify.tudominio.com/api/v1/applications/<APP-UUID>/logs
  ```

## 8. Auto-update del worker desde Git

Coolify → app → **Webhooks** → activa **Auto-deploy on push**. Cada vez que
hagas push al repo del worker, Coolify reconstruye y despliega solo. Los
adapters anti-detección se actualizan así sin tocar nada en Lovable.
