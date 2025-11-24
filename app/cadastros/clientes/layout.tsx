'use client'

import { Suspense } from 'react'
import { usePathname } from 'next/navigation'
import { TopNav } from '@/src/presentation/components/layouts/TopNav'
import { Header } from '@/src/presentation/components/layouts/Header'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'

export default function ClientesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const hideHeader = pathname?.includes('/novo') || pathname?.includes('/editar') || pathname?.includes('/visualizar')

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />
      {!hideHeader && <Header nomePagina="Clientes" />}
      <main className={`${hideHeader ? '' : 'p-6'}`}>
        <Suspense fallback={<PageLoading />}>
          {children}
        </Suspense>
      </main>
    </div>
  )
}
