'use client'

import { TopNav } from '@/src/presentation/components/layouts/TopNav'

/**
 * Layout do dashboard com navegação superior
 * Altura da viewport em coluna: TopNav fixo no topo e apenas o main rola (mobile e desktop).
 * Proteção feita pelo middleware
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-gray-50">
      <TopNav />

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-1 md:px-2">
        {children}
      </main>
    </div>
  )
}
