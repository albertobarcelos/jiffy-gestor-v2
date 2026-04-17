'use client'

import { usePathname } from 'next/navigation'
import { TopNav } from '@/src/presentation/components/layouts/TopNav'


export default function ProdutosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  
  return (
    <div className="h-screen overflow-hidden bg-gray-50 flex flex-col">
      {/* Navegação superior */}
      <TopNav />

      {/* Conteúdo principal: flex-1 + min-h-0 para a cadeia h-full/flex-1 da lista virtualizada */}
      <main className="flex flex-1 min-h-0 flex-col md:px-6 px-1 py-2">
        {children}
      </main>
    </div>
  )
}
