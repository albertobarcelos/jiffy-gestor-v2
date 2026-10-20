/** @type {import('next').NextConfig} */
const path = require('path')

const nextConfig = {
  reactStrictMode: true,
  /** Imagem Docker / Railway usa `output: 'standalone'`. */
  output: 'standalone',
  /** WebView do Flow usa 127.0.0.1; o Next anuncia localhost. */
  allowedDevOrigins: ['127.0.0.1'],
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    /**
     * Cota de Image Optimization na Vercel: cada URL + largura + formato +
     * qualidade é uma transformação e uma escrita de cache.
     * Foto nova ganha imageId novo na URL, então cache de 31 dias não segura
     * a imagem anterior no cardápio.
     * imageSizes ficam abaixo do menor deviceSize (exigência do Next).
     */
    formats: ['image/webp'],
    qualities: [75],
    deviceSizes: [640, 1080, 1280],
    imageSizes: [64, 128, 256, 384],
    minimumCacheTTL: 2678400,
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3845',
        pathname: '/assets/**',
      },
      { protocol: 'https', hostname: '**.amazonaws.com' },
      { protocol: 'https', hostname: '**.cloudfront.net' },
      { protocol: 'https', hostname: '**.r2.dev' },
      { protocol: 'https', hostname: '**.r2.cloudflarestorage.com' },
    ],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  experimental: {
    externalDir: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      }
    }

    config.resolve.alias = {
      ...config.resolve.alias,
      '@jiffy/preco-vigente-snapshot': path.resolve(
        __dirname,
        '../../src/domain/policies/menu/precoVigenteSnapshot.ts'
      ),
    }

    config.resolve.modules = [
      path.resolve(__dirname, 'node_modules'),
      'node_modules',
    ]

    return config
  },
}

module.exports = nextConfig
