/** @type {import('next').NextConfig} */
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Para GitHub Pages: https://midia-hub.github.io/saraalagoas/
const basePath = process.env.NODE_ENV === 'production' ? '/saraalagoas' : ''
const assetPrefix = process.env.NODE_ENV === 'production' ? '/saraalagoas/' : ''

// Excluir pasta src (projeto Vite antigo) do build do Next.js
const excludeSrc = /[\\/]src[\\/]/

const nextConfig = {
  output: 'export',
  basePath,
  assetPrefix,
  images: {
    unoptimized: true,
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  reactStrictMode: true,
  trailingSlash: true,
  webpack: (config) => {
    // Fallback para Vercel/build: se src/ for compilado, @supabase/supabase-js usa stub
    config.resolve = config.resolve || {}
    config.resolve.alias = {
      ...config.resolve.alias,
      '@supabase/supabase-js': path.resolve(__dirname, 'empty-module.js'),
    }
    // Excluir pasta src de TODAS as regras que processam ts/tsx/js
    const addExclude = (rule) => {
      if (!rule) return
      if (rule.test && (rule.test.toString().includes('tsx') || rule.test.toString().includes('ts') || rule.test.toString().includes('jsx'))) {
        rule.exclude = Array.isArray(rule.exclude) ? [...rule.exclude, excludeSrc] : rule.exclude ? [rule.exclude, excludeSrc] : [excludeSrc]
      }
      if (rule.oneOf) rule.oneOf.forEach(addExclude)
    }
    config.module.rules.forEach(addExclude)
    return config
  },
}

export default nextConfig
