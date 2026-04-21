'use client'

import { TopNav } from '@/src/presentation/components/layouts/TopNav'

/**
 * Shell fora do fluxo do documento — mesmo padrão de complementos e demais cadastros.
 */
export default function TaxasLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[40] flex flex-col overflow-hidden overscroll-none bg-gray-50">
      <div className="shrink-0">
        <TopNav />
      </div>
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden md:px-6 px-1">
        {children}
      </main>
    </div>
  )
}
