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
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3845',
        pathname: '/assets/**',
      },
    ],
    unoptimized: true,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      }
    }

    config.resolve.modules = [
      path.resolve(__dirname, 'node_modules'),
      'node_modules',
    ]

    return config
  },
}

module.exports = nextConfig
