'use client'

import { usePathname } from 'next/navigation'
import { TopNav } from '@/src/presentation/components/layouts/TopNav'
import { Header } from '@/src/presentation/components/layouts/Header'

export default function ImpressorasLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const hideHeader = pathname?.includes('/novo') || pathname?.includes('/editar')

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />
      {!hideHeader && <Header nomePagina="Impressoras" />}
      <main className={`${hideHeader ? '' : 'p-6'}`}>
        {children}
      </main>
    </div>
  )
}
