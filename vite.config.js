// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    proxy: {
      '/api/characters': {
        target: 'https://basic-api-wiki-hvdo.vercel.app',
        changeOrigin: true,
        secure: true,
      }
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      devOptions: {
        enabled: true,
      },
      manifest: {
        name: 'Enter The Dungeon Wiki',
        short_name: 'ETD Wiki',
        description: 'Wiki PWA para promocionar y editar contenido del videojuego con cache offline.',
        theme_color: '#0b1020',
        background_color: '#050910',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'vite.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: 'vite.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any'
          }
        ]
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /\/api\/characters\/?$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'characters-cache',
              cacheableResponse: {
                statuses: [0, 200]
              },
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60
              }
            }
          }
        ]
      }
    })
  ]
})