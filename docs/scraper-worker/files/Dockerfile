# InmoOS Scraper Worker — imagen base con Playwright + Chromium + dependencias del sistema
FROM mcr.microsoft.com/playwright:v1.47.0-jammy

WORKDIR /app

# Instalar xvfb para ejecutar Chromium en modo "headed" (mejor evasión que headless)
RUN apt-get update && apt-get install -y --no-install-recommends \
    xvfb \
    dumb-init \
    && rm -rf /var/lib/apt/lists/*

# Dependencias
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

# dumb-init para señales correctas + xvfb-run para Chromium con display virtual
ENTRYPOINT ["dumb-init", "--"]
CMD ["xvfb-run", "-a", "--server-args=-screen 0 1366x768x24", "node", "dist/server.js"]
