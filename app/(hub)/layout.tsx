'use client'

import { HubSessionPingListener } from '@/src/presentation/components/auth/HubSessionPingListener'
import { HubAppShell } from '@/src/presentation/components/layouts/HubAppShell'

/**
 * Layout compartilhado do hub pós-login (`/meus-apps`, `/perfil`, etc.).
 * Sidebar + top bar do hub não remontam ao navegar entre filhos.
 */
export default function HubRouteGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <HubAppShell>
      <HubSessionPingListener />
      {children}
    </HubAppShell>
  )
}
