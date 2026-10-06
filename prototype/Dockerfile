# Statischer Webserver für den Prototyp (läuft ohne Root-Rechte auf Port 8080)
FROM nginxinc/nginx-unprivileged:1.27-alpine

LABEL org.opencontainers.image.title="PuzzleGame Prototype" \
      org.opencontainers.image.description="Cozy Garden Block Puzzle – Block-Puzzle mit Pflanzenformen aus Naturmaterialien (YouTube-Playables-Prototyp)" \
      org.opencontainers.image.version="0.2.0"

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html /usr/share/nginx/html/
COPY src/ /usr/share/nginx/html/src/

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
