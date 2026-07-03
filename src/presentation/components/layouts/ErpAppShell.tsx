'use client'

import type { ReactNode } from 'react'
import { TopNav } from '@/src/presentation/components/layouts/TopNav'
import { ErpTenantAccessGuard } from '@/src/presentation/components/layouts/ErpTenantAccessGuard'
import { useDetectCacheLeaks } from '@/src/presentation/hooks/useDetectCacheLeaks'

function ErpAppShellInner({ children }: { children: ReactNode }) {
  useDetectCacheLeaks()

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-gray-50">
      <TopNav />

      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain px-1 md:px-2">
        {children}
      </main>
    </div>
  )
}

/**
 * Shell único do ERP: TopNav montado uma vez por sessão de navegação entre rotas irmãs em `app/(erp)/`.
 * Padrão visual: coluna 100dvh, TopNav fixo, `main` com scroll (ex-layout dashboard).
 * Protegido por ErpTenantAccessGuard: redireciona para /login ou /meus-apps se a sessão de empresa for inválida.
 */
export function ErpAppShell({ children }: { children: ReactNode }) {
  return (
    <ErpTenantAccessGuard>
      <ErpAppShellInner>{children}</ErpAppShellInner>
    </ErpTenantAccessGuard>
  )
}
