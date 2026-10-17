# mess&preuef-protocol
a simple webapp to make the process of the Mess- und Prüfprotokoll

## Entwicklung

```sh
pnpm install     # Abhängigkeiten installieren
pnpm dev         # Dev-Server (http://localhost:3000)
pnpm test        # Vitest
pnpm generate    # statische Seite nach .output/public
```

Für GitHub Pages wird mit `NUXT_APP_BASE_URL=/mess-preuef-protocol/` gebaut (siehe `.github/workflows/deploy.yml`).
