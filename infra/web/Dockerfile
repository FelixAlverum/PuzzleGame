# Statischer Webserver (läuft ohne Root-Rechte auf Port 8080).
# Build-Kontext ist die Repo-Wurzel: docker build -f infra/web/Dockerfile .
# Heute liefert er Cozy Garden direkt aus. Sobald es die Plattform-Hülle (apps/web) gibt, wird daraus ein
# mehrstufiger Build (Vite) – siehe docs/betrieb.md.
FROM nginxinc/nginx-unprivileged:1.27-alpine

LABEL org.opencontainers.image.title="Cozy Garden" \
      org.opencontainers.image.description="Cozy Garden – Block-Puzzle mit Pflanzenformen aus Naturmaterialien" \
      org.opencontainers.image.version="0.5.0"

COPY infra/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY games/cozy-garden/index.html /usr/share/nginx/html/
COPY games/cozy-garden/src/ /usr/share/nginx/html/src/

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
