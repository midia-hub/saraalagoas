/** @type {import('next').NextConfig} */
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Para GitHub Pages: https://midia-hub.github.io/saraalagoas/
// Em Vercel/domínio próprio, mantenha vazio para evitar 404 em /_next/static.
const useGithubPagesBasePath =
  process.env.NEXT_PUBLIC_USE_BASEPATH === 'true'
const isStaticExport =
  process.env.NODE_ENV === 'production' && useGithubPagesBasePath

const basePath = useGithubPagesBasePath ? '/saraalagoas' : ''
const assetPrefix = useGithubPagesBasePath ? '/saraalagoas/' : ''

// Limite de body para upload (Route Handlers). Em serverless ex.: Vercel o limite do plano pode ser ~4,5 MB.
const nextConfig = {
  ...(isStaticExport ? { output: 'export' } : {}),
  basePath,
  assetPrefix,
  experimental: {
    proxyClientMaxBodySize: '11mb', // permite uploads até ~10 MB quando o servidor (Node) aceitar
  },
  images: {
    unoptimized: true,
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  reactStrictMode: true,
  trailingSlash: true,
}

export default nextConfig
