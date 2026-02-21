'use client'

import { TopNav } from '@/src/presentation/components/layouts/TopNav'

export default function HistoricoFechamentoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />
      <main className="md:px-6 px-2">
        {children}
      </main>
    </div>
  )
}

