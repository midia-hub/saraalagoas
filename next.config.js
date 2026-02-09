/** @type {import('next').NextConfig} */
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Para GitHub Pages: https://midia-hub.github.io/saraalagoas/
const basePath = process.env.NODE_ENV === 'production' ? '/saraalagoas' : ''
const assetPrefix = process.env.NODE_ENV === 'production' ? '/saraalagoas/' : ''

// Excluir pasta src (projeto Vite antigo) do build do Next.js
const excludeSrc = /[\\/]src[\\/]/

// Não usar output: 'export' – a galeria usa rotas dinâmicas (/galeria/[tipo]/[slug]/[date])
// que precisam de servidor (SSR ou Node). Para GitHub Pages estático, use outro host (ex.: Vercel) para o Next.
const nextConfig = {
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
  // Next.js 16: Turbopack é o padrão; config vazia evita erro quando há webpack customizado
  turbopack: {},
  webpack: (config) => {
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
