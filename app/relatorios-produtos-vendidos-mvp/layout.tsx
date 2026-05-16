'use client'

import { TopNav } from '@/src/presentation/components/layouts/TopNav'

export default function RelatoriosProdutosVendidosMvpLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <TopNav />
      <main className="px-1 md:px-6">{children}</main>
    </div>
  )
}
