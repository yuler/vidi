import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2026-08-16',
  devtools: { enabled: true },
  modules: ['@nuxtjs/color-mode'],
  app: {
    head: {
      title: 'Vidi',
      viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
      meta: [
        { name: 'theme-color', content: '#0f172a' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
      ],
    },
  },
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()],
  },
  components: [
    {
      path: '~/components',
      pathPrefix: false,
      ignore: ['**/index.ts'],
    },
  ],
  colorMode: {
    preference: 'system',
    fallback: 'dark',
  },
})
