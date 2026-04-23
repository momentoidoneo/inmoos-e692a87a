# InmoOS Scraper Worker — imagen base con Playwright + Chromium + dependencias del sistema
FROM mcr.microsoft.com/playwright:v1.47.0-jammy

WORKDIR /app

# Dependencias del sistema:
# - xvfb: display virtual para correr Chromium en modo "headed" (mejor evasión)
# - dumb-init: manejo correcto de señales
# - dbus-x11: evita "Failed to connect to dbus" que provoca SIGSEGV en Chromium
# - libnss3, libgbm1, libasound2: requeridas por Chromium aunque a veces faltan
RUN apt-get update && apt-get install -y --no-install-recommends \
    xvfb \
    dumb-init \
    dbus \
    dbus-x11 \
    libnss3 \
    libgbm1 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

# Dependencias node
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev=false

# Código
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc

# Usuario no-root
RUN useradd -m -u 1001 worker && chown -R worker:worker /app
USER worker

EXPOSE 3000

# Script de arranque: inicia dbus + xvfb + node
# (dbus debe arrancar como el usuario worker para evitar el error de socket)
ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "mkdir -p /tmp/dbus && dbus-daemon --session --address=unix:path=/tmp/dbus/session --nofork --nopidfile --syslog-only & export DBUS_SESSION_BUS_ADDRESS=unix:path=/tmp/dbus/session && xvfb-run -a --server-args='-screen 0 1366x768x24' node dist/server.js"]
