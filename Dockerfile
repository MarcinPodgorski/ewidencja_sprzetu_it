# syntax=docker/dockerfile:1
#
# Obraz produkcyjny Ewidencji sprzętu IT: jeden proces Node serwuje API i zbudowany
# frontend pod /sprzet. Dane (baza, załączniki, kopie zapasowe) w wolumenie /data.
# Uruchamianie: docker-compose.yml i README → „Docker (np. na Proxmoxie)”.

# ---------------------------------------------------------------------------
# Etap 1: budowanie (shared → server → client) na tym samym systemie co obraz
# docelowy — silnik Prismy i natywne pakiety esbuild/Rollup pasują do Linuksa.
# ---------------------------------------------------------------------------
FROM node:24-bookworm-slim AS build
# OpenSSL: Prisma dobiera silnik bazy do wersji libssl w systemie.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*
ENV CHECKPOINT_DISABLE=1 PRISMA_HIDE_UPDATE_MESSAGE=1
WORKDIR /app

# Najpierw same manifesty — warstwa z node_modules przebudowuje się tylko po zmianie zależności.
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci

COPY . .
RUN npx prisma generate --schema server/prisma/schema.prisma \
 && npm run build

# ---------------------------------------------------------------------------
# Etap 2: obraz uruchomieniowy.
# ---------------------------------------------------------------------------
FROM node:24-bookworm-slim
# tini — poprawne zatrzymywanie (docker stop); tzdata — godziny kopii i daty w PDF po polsku.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl tini tzdata \
 && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PORT=4000 \
    APP_BASE_PATH=/sprzet \
    DATABASE_URL=file:/data/sprzet.db \
    UPLOADS_DIR=/data/uploads \
    BACKUP_DIR=/data/backups \
    TZ=Europe/Warsaw \
    RUNS_IN_DOCKER=true \
    CHECKPOINT_DISABLE=1 \
    PRISMA_HIDE_UPDATE_MESSAGE=1

WORKDIR /app
# Kod i zależności należą do roota (tylko do odczytu) — aplikacja pisze wyłącznie do /data.
# Zależności deweloperskie zostają: CLI Prismy jest potrzebne do migracji przy starcie.
COPY --from=build /app /app
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + process.env.PORT + process.env.APP_BASE_PATH + '/', { headers: { 'X-Healthcheck': '1' } }).then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]

# Przed startem serwera migracje bazy — na pustym wolumenie tworzą całą bazę, po
# aktualizacji obrazu dokładają nowe tabele. Konto admina serwer zakłada sam (log).
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy --schema server/prisma/schema.prisma && exec node server/dist/index.js"]
