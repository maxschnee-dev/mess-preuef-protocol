const baseURL = process.env.NUXT_APP_BASE_URL || '/'

export default defineNuxtConfig({
  compatibilityDate: '2026-10-17',
  ssr: false,
  devtools: { enabled: false },
  modules: ['@nuxt/ui', '@vite-pwa/nuxt'],
  css: ['~/assets/css/main.css'],
  app: {
    baseURL,
    head: {
      htmlAttrs: { lang: 'de' },
      title: 'Mess- + Prüfprotokoll',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#0f766e' },
      ],
      link: [
        { rel: 'icon', href: `${baseURL}favicon.ico`, sizes: '48x48' },
        { rel: 'icon', href: `${baseURL}icon.svg`, type: 'image/svg+xml', sizes: 'any' },
        { rel: 'apple-touch-icon', href: `${baseURL}apple-touch-icon-180x180.png` },
      ],
    },
  },
  nitro: {
    prerender: { routes: ['/'] },
  },
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Mess- + Prüfprotokoll',
      short_name: 'Prüfprotokoll',
      description: 'Mess- + Prüfprotokoll (VSEI 133-D) offline erfassen',
      lang: 'de',
      theme_color: '#0f766e',
      background_color: '#ffffff',
      display: 'standalone',
      start_url: baseURL,
      scope: baseURL,
      icons: [
        { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
        { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest,woff2}'],
      navigateFallback: baseURL,
      cleanupOutdatedCaches: true,
      // Nuxt's 200/404 fallback pages get precached as extensionless URLs a static host may 404, failing the SW install.
      globIgnores: ['200.html', '404.html'],
    },
    client: { installPrompt: false },
    devOptions: { enabled: false },
  },
})
