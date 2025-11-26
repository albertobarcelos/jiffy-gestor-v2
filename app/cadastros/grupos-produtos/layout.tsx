'use client'

import { usePathname } from 'next/navigation'
import { TopNav } from '@/src/presentation/components/layouts/TopNav'

export default function GruposProdutosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const hideHeader = pathname?.includes('/novo') || pathname?.includes('/editar')

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TopNav />
      <main className={`flex-1 flex flex-col ${hideHeader ? '' : 'p-6'}`}>
        {children}
      </main>
    </div>
  )
}
