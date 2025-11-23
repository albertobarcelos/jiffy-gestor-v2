/** @type {import('next').NextConfig} */
const path = require('path')

const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [],
  },
  transpilePackages: ['recharts', '@radix-ui/react-slot'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      }
    }
    
    // Configurar resolução de módulos para priorizar node_modules local
    // Isso garante que todos os pacotes sejam resolvidos do diretório local
    config.resolve.modules = [
      path.resolve(__dirname, 'node_modules'),
      'node_modules',
    ]
    
    // Garantir que recharts e @radix-ui/react-slot sejam resolvidos do node_modules local
    const rechartsPath = path.resolve(__dirname, 'node_modules', 'recharts')
    const radixSlotPath = path.resolve(__dirname, 'node_modules', '@radix-ui', 'react-slot')
    
    config.resolve.alias = {
      ...config.resolve.alias,
      recharts: rechartsPath,
      '@radix-ui/react-slot': radixSlotPath,
    }
    
    // Configurar condições de exportação para priorizar módulos ESM
    config.resolve.conditionNames = ['import', 'require', 'default']
    
    return config
  },
}

module.exports = nextConfig
