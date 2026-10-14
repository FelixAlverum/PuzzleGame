# Betrieb und Bereitstellung

## Heute: Plattform-Hülle als statischer Webserver

Öffentliches Image auf Docker Hub: [`alverum/puzzlegame`](https://hub.docker.com/r/alverum/puzzlegame) (amd64 + arm64).
Ab 0.6.0 liefert es die Plattform-Hülle samt Spielen aus (nginx ohne Root-Rechte, Port 8080).
Den Image-Namen behalten wir bei, bis die Sammlung einen Namen hat, damit bestehende Server weiterlaufen.

```
docker run -d -p 8080:8080 alverum/puzzlegame:latest
```

Danach `http://localhost:8080` öffnen. Auf dem Server: [infra/docker-compose.yml](../infra/docker-compose.yml).

Neue Version veröffentlichen, **aus der Repo-Wurzel** (Version in `infra/web/Dockerfile` und im Befehl anpassen):
```
docker buildx build --platform linux/amd64,linux/arm64 -f infra/web/Dockerfile -t alverum/puzzlegame:0.7.1 -t alverum/puzzlegame:latest --push .
```

[infra/web/Dockerfile](../infra/web/Dockerfile) arbeitet in zwei Stufen. `node:22-alpine` führt `npm ci` und
`npm run build` aus, und zwar einmal nativ auf der Build-Maschine, weil nur statische Dateien entstehen. Danach liefert
`nginx-unprivileged` den Inhalt von `apps/web/dist` aus. Was in den Build-Kontext darf, legt die Allowlist in
[.dockerignore](../.dockerignore) fest.

Caching ([infra/web/nginx.conf](../infra/web/nginx.conf)): `index.html`, `sw.js` und `manifest.webmanifest` mit
`no-cache`, damit ein neuer Build sofort ankommt. `assets/*` (Dateinamen mit Hash) ein Jahr `immutable`.

Ohne Docker ansehen: `npm run build && npm run preview`, dann `http://localhost:4173`.

## Ziel: docker-compose mit Hülle, API und Datenbank

| Dienst | Aufgabe |
|---|---|
| `web` | nginx: statischer Vite-Build von `apps/web` samt Spielen, leitet `/api` an `api` weiter |
| `api` | Node (z. B. Fastify) mit fertiger Auth-Bibliothek (z. B. better-auth) |
| `db` | Postgres, nächtliches Backup (`pg_dump`) auf ein externes Ziel |
| `proxy` | Caddy für automatisches HTTPS |

- Images getrennt auf Docker Hub: `…-web` und `…-api`. Der Name folgt, sobald die Sammlung einen hat.
- Für den Anfang reicht ein kleiner VPS (z. B. Hetzner).

## PWA

Vorhanden seit Phase 1 (`apps/web/public/`): Manifest, Icon und Service Worker. Seiten holt er zuerst übers Netz,
mit dem Cache als Rückfall. Gebaute Dateien holt er zuerst aus dem Cache. Damit ist die Sammlung installierbar und
nach dem ersten Besuch offline spielbar. Der Service Worker wird nur im Produktions-Build angemeldet, nicht im Dev-Server.
Bei grundlegenden Änderungen an der Cache-Strategie `CACHE` in `sw.js` hochzählen, dann werden alte Caches gelöscht.

Offen: Das Icon gibt es nur als SVG. Für alle Plattformen (vor allem iOS) braucht es zusätzlich PNG-Icons in 192 und 512 px.
Wenn nötig, lässt sich die Hülle später mit Capacitor oder Tauri als App für die Stores verpacken,
ohne die Spiele anzufassen.

## Bezahlung

Empfehlung: ein **Merchant of Record** (z. B. Paddle oder Lemon Squeezy) statt Stripe direkt. Der Anbieter tritt
als Verkäufer auf und übernimmt EU-Umsatzsteuer (OSS) und Rechnungen. Für ein Ein-Personen-Projekt spart das viel.

Ablauf: Checkout beim Anbieter → Webhook an `api` → Zeile in `orders` → `entitlements` → die Hülle meldet
`entitlements.onChange` an das laufende Spiel. Rückerstattung → `revoked_at` setzen.

## Rechtliches

Vor dem ersten Verkauf Pflicht (Deutschland/EU):

- Impressum
- Datenschutzerklärung (Konto, Spielstände, Zahlungsanbieter, Hosting)
- AGB
- Widerrufsbelehrung für digitale Inhalte, inklusive Zustimmung zum vorzeitigen Erlöschen des Widerrufsrechts im Checkout
- Datenexport und Kontolöschung im Profil (DSGVO)
