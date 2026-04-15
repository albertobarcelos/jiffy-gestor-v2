'use client'

import { TopNav } from '@/src/presentation/components/layouts/TopNav'

export default function RelatoriosVendasLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />
      <main className="px-1 md:px-6">{children}</main>
    </div>
  )
}

