/** @type {import('next').NextConfig} */

// Para GitHub Pages: https://midia-hub.github.io/saraalagoas/
const basePath = process.env.NODE_ENV === 'production' ? '/saraalagoas' : ''
const assetPrefix = process.env.NODE_ENV === 'production' ? '/saraalagoas/' : ''

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
}

export default nextConfig
