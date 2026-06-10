'use client'

import type { ReactNode } from 'react'
import { MeusAppsTopNav } from '@/src/presentation/components/features/meus-apps/components/MeusAppsTopNav'

/**
 * Shell único do hub (Meus Apps): TopNav montado uma vez por sessão de navegação
 * entre rotas irmãs em `app/(hub)/` (ex.: meus-apps ↔ perfil).
 */
export function HubAppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-gray-50">
      <MeusAppsTopNav />

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
        {children}
      </main>
    </div>
  )
}
