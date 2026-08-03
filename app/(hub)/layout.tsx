'use client'

import { HubSessionPingListener } from '@/src/presentation/components/auth/HubSessionPingListener'
import { HubAppShell } from '@/src/presentation/components/layouts/HubAppShell'
import { HUB_PATH } from '@/src/shared/constants/hubRoutes'

/**
 * Layout compartilhado do hub pós-login ({@link HUB_PATH}, `/perfil`, etc.).
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
