# Betrieb und Bereitstellung

## Heute: statischer Webserver

Öffentliches Image auf Docker Hub: [`alverum/puzzlegame`](https://hub.docker.com/r/alverum/puzzlegame) (amd64 + arm64).
Es liefert Cozy Garden über nginx aus (ohne Root-Rechte, Port 8080).
Den Image-Namen behalten wir bei, bis die Sammlung einen Namen hat, damit bestehende Server weiterlaufen.

```
docker run -d -p 8080:8080 alverum/puzzlegame:latest
```

Danach `http://localhost:8080` öffnen. Auf dem Server: [infra/docker-compose.yml](../infra/docker-compose.yml).

Neue Version veröffentlichen, **aus der Repo-Wurzel** (Version in `infra/web/Dockerfile` und im Befehl anpassen):
```
docker buildx build --platform linux/amd64,linux/arm64 -f infra/web/Dockerfile -t alverum/puzzlegame:0.5.0 -t alverum/puzzlegame:latest --push .
```

Build-Kontext ist die Repo-Wurzel. Was ins Image darf, legt die Allowlist in [.dockerignore](../.dockerignore) fest.

## Ziel: docker-compose mit Hülle, API und Datenbank

| Dienst | Aufgabe |
|---|---|
| `web` | nginx: statischer Vite-Build von `apps/web` samt Spielen, leitet `/api` an `api` weiter |
| `api` | Node (z. B. Fastify) mit fertiger Auth-Bibliothek (z. B. better-auth) |
| `db` | Postgres, nächtliches Backup (`pg_dump`) auf ein externes Ziel |
| `proxy` | Caddy für automatisches HTTPS |

- Images getrennt auf Docker Hub: `…-web` und `…-api`. Der Name folgt, sobald die Sammlung einen hat.
- Für den Anfang reicht ein kleiner VPS (z. B. Hetzner).
- `infra/web/Dockerfile` wird dann mehrstufig: `node` baut mit Vite, `nginx-unprivileged` liefert aus.

## PWA

Manifest + Service Worker: installierbar auf Handy und Desktop, offline spielbar (Gastmodus, Sync später).
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
