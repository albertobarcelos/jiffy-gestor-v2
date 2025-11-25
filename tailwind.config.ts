import type { Config } from 'tailwindcss'
import { tailwindColors } from './src/shared/theme/colors'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Cores do sistema (replicando Flutter)
        ...tailwindColors,
        // Cores padrão do Next.js (mantidas para compatibilidade)
        background: 'var(--background)',
        foreground: 'var(--foreground)',
      },
      fontFamily: {
        // Fontes do sistema
        sans: ['var(--font-exo2)', 'sans-serif'], // Exo 2 como fonte padrão
        heading: ['var(--font-manrope)', 'sans-serif'], // Manrope para títulos
        // Aliases para retrocompatibilidade
        exo: ['var(--font-exo2)', 'sans-serif'],
        manrope: ['var(--font-manrope)', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config

