'use client'

import type { ReactNode } from 'react'
import { TopNav } from '@/src/presentation/components/layouts/TopNav'

/**
 * Shell único do ERP: TopNav montado uma vez por sessão de navegação entre rotas irmãs em `app/(erp)/`.
 * Padrão visual: coluna 100dvh, TopNav fixo, `main` com scroll (ex-layout dashboard).
 */
export function ErpAppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-gray-50">
      <TopNav />

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-1 md:px-2">
        {children}
      </main>
    </div>
  )
}
