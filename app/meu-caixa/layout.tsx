'use client'

import { TopNav } from '@/src/presentation/components/layouts/TopNav'
import { Header } from '@/src/presentation/components/layouts/Header'

export default function MeuCaixaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />
      <Header nomePagina="Meu Caixa" />
      <main className="p-6">
        {children}
      </main>
    </div>
  )
}
