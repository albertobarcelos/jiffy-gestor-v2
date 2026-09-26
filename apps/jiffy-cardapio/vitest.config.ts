import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['node_modules', '.next'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@jiffy/preco-vigente-snapshot': path.resolve(
        __dirname,
        '../../src/domain/policies/menu/precoVigenteSnapshot.ts'
      ),
    },
  },
})
