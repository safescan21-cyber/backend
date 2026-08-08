import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { createHtmlPlugin } from 'vite-plugin-html'

export default defineConfig({
  plugins: [
    tailwindcss(),
    createHtmlPlugin({
      inject: {
        data: {
          meta: '<meta http-equiv="Cross-Origin-Opener-Policy" content="same-origin-allow-popups">',
        },
      },
    }),
  ],
  server: {
    // Add proxy configuration
    proxy: {
      '/api': {
        target: 'http://localhost:3000',   // your backend
        changeOrigin: true,
        secure: false,
      }
    },
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
})