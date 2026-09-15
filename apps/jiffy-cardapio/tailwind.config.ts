import type { Config } from 'tailwindcss'
import containerQueries from '@tailwindcss/container-queries'
import formsPlugin from '@tailwindcss/forms'
import { tailwindColors } from './src/shared/theme/colors'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ...tailwindColors,
        background: 'var(--background)',
        foreground: 'var(--foreground)',
      },
      fontFamily: {
        sans: ['system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [
    containerQueries,
    formsPlugin({
      strategy: 'class',
    }),
  ],
}

export default config
