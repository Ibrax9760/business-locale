import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate', // Met à jour le Service Worker automatiquement en arrière-plan
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Ma Boutique Locale',
        short_name: 'Boutique',
        description: 'Application de commande et réservation en ligne',
        theme_color: '#f8f6f0',
        background_color: '#f8f6f0',
        display: 'standalone', // Supprime la barre d'URL du navigateur une fois installé
        orientation: 'portrait',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // Détermine les fichiers à mettre en cache pour un fonctionnement optimal
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ]
})