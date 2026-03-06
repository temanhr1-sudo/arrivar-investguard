import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy untuk local dev: /api/yahoo → Yahoo Finance langsung
      // Di Vercel production: request ditangani api/yahoo.js (serverless)
      '/api/yahoo': {
        target: 'https://query2.finance.yahoo.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => {
          const chartMatch = path.match(/\/api\/yahoo\?chart=([^&]+)/)
          if (chartMatch) return `/v8/finance/chart/${chartMatch[1]}`
          if (path.includes('crumb=')) return '/v1/test/getcrumb'
          return path.replace('/api/yahoo', '/v7/finance/quote')
        },
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36')
            proxyReq.setHeader('Accept', 'application/json, text/plain, */*')
            proxyReq.setHeader('Accept-Language', 'en-US,en;q=0.9')
            proxyReq.setHeader('Referer', 'https://finance.yahoo.com/')
            proxyReq.setHeader('Origin', 'https://finance.yahoo.com')
          })
        }
      }
    }
  }
})