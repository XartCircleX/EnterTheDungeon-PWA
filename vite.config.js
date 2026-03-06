// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { createSsrHtmlResponse } from './server/renderSsrPage.js'

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
    {
      name: 'local-ssr-route',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const requestPath = req.url?.split('?')[0]
          if (requestPath !== '/ssr') {
            next()
            return
          }
          const html = await createSsrHtmlResponse()
          res.statusCode = 200
          res.setHeader('Content-Type', 'text/html; charset=utf-8')
          res.end(html)
        })
      },
    },
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
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/ssr(?:\/)?$/, /^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ url, request }) => request.mode === 'navigate' && url.pathname === '/ssr',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'ssr-pages-cache',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24,
              },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname === '/api/characters',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'characters-api-cache',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          }
        ]
      }
    })
  ]
})