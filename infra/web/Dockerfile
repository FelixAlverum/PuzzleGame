# Zweistufig: Node baut die Plattform-Hülle samt Spielen mit Vite, nginx liefert den statischen Build aus
# (ohne Root-Rechte, Port 8080). Build-Kontext ist die Repo-Wurzel: docker build -f infra/web/Dockerfile .

# Der Build erzeugt nur statische Dateien → einmal nativ auf der Build-Maschine, auch bei amd64 + arm64
FROM --platform=$BUILDPLATFORM node:22-alpine AS build
WORKDIR /src
COPY . .
RUN npm ci && npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine

LABEL org.opencontainers.image.title="Spielesammlung" \
      org.opencontainers.image.description="Spielesammlung im Browser – Cozy Garden, Minesweeper, Solitaire und Spider" \
      org.opencontainers.image.version="0.8.1"

COPY infra/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/apps/web/dist/ /usr/share/nginx/html/

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
