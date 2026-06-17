import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'child_process'

function getGitHash(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim()
  } catch {
    return 'unknown'
  }
}

function getGitDate(): string {
  try {
    const date = execSync('git log -1 --format=%cd --date=short', { encoding: 'utf-8' }).trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date
    return new Date().toISOString().split('T')[0]
  } catch {
    return new Date().toISOString().split('T')[0]
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      devOptions: {
        enabled: true,
        suppressWarnings: true
      },
      manifest: {
        id: 'de.ffl.app',
        name: 'FFL - Fantasy Football League',
        short_name: 'FFL',
        description: 'Fantasy Football League Dashboard',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone'],
        orientation: 'portrait',
        background_color: '#0f1419',
        theme_color: '#c9a66b',
        handle_links: 'preferred',
        launch_handler: {
          client_mode: 'navigate-existing'
        },
        related_applications: [],
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        categories: ['sports', 'entertainment'],
        screenshots: []
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        globIgnores: ['**/background.png', '**/after_login.png', '**/back2.png', '**/back3.png', '**/hintergrundbild.png', '**/background.mp4'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/ffl\.ipv64\.de\/api/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60
              }
            }
          }
        ]
      }
    })
  ],
  define: {
    'import.meta.env.VITE_GIT_HASH': JSON.stringify(getGitHash()),
    'import.meta.env.VITE_BUILD_DATE': JSON.stringify(getGitDate()),
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
