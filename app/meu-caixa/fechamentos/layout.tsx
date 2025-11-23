'use client'

import { TopNav } from '@/src/presentation/components/layouts/TopNav'
import { Header } from '@/src/presentation/components/layouts/Header'

export default function FechamentosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />
      <Header nomePagina="Fechamentos" />
      <main className="p-6">
        {children}
      </main>
    </div>
  )
}
