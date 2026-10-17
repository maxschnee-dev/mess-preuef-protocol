# 0001 – Client-only PWA, Protokolle in web storage

Status: accepted (2026-10-17)

The app is a Nuxt 4 / Vue SPA (`ssr: false`, statically generated) installable as an offline-capable PWA. There is no backend: all Protokolle live in the browser's web storage on the device. Electricians work in basements and plant rooms without signal, so offline is a hard requirement; a backend can be added later behind the storage layer.
