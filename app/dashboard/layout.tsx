'use client'

import { TopNav } from '@/src/presentation/components/layouts/TopNav'

/**
 * Layout do dashboard com navegação superior
 * Design minimalista e clean
 * Proteção feita pelo middleware
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navegação superior */}
      <TopNav />

      {/* Conteúdo principal */}
      <main className="px-1 md:px-2">
        {children}
      </main>
    </div>
  )
}
