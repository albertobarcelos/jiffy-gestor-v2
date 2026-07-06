import path from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: [
      {
        find: '@/features/kanban',
        replacement: path.resolve(__dirname, 'src/presentation/components/features/kanban'),
      },
      {
        find: '@/features/pedidos',
        replacement: path.resolve(__dirname, 'src/presentation/components/features/pedidos'),
      },
      {
        find: '@/features/delivery',
        replacement: path.resolve(__dirname, 'src/presentation/components/features/delivery'),
      },
      {
        find: '@/features/fiscal',
        replacement: path.resolve(__dirname, 'src/presentation/components/features/fiscal'),
      },
      { find: '@', replacement: path.resolve(__dirname, '.') },
    ],
  },
})
