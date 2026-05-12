'use client'

import { HubSessionPingListener } from '@/src/presentation/components/auth/HubSessionPingListener'

/**
 * Layout do hub pós-login (seleção/recursos multi-empresa).
 * Não usa o TopNav principal do ERP; possui navegação própria (Omie-like).
 * Proteção de sessão centralizada no root layout (AuthGuard + TabSessionBootstrap).
 */
export default function MeusAppsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-gray-50">
      <HubSessionPingListener />
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
        {children}
      </main>
    </div>
  )
}

