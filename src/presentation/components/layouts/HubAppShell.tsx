'use client'

import { useState, type ReactNode } from 'react'
import { HubSearchProvider } from '@/src/presentation/contexts/HubSearchContext'
import { HubSidebar } from '@/src/presentation/components/layouts/HubSidebar'
import { HubTopBar } from '@/src/presentation/components/layouts/HubTopBar'

/**
 * Shell único do hub (Meus Apps): sidebar + top bar montados uma vez por sessão
 * de navegação entre rotas irmãs em `app/(hub)/`.
 */
export function HubAppShell({ children }: { children: ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  return (
    <HubSearchProvider>
      <div className="flex h-[100dvh] min-h-0 overflow-hidden bg-gray-50">
        <HubSidebar
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <HubTopBar onMenuClick={() => setMobileSidebarOpen(true)} />

          <main className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">{children}</main>
        </div>
      </div>
    </HubSearchProvider>
  )
}
