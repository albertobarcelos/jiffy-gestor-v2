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

      {/* Conteúdo principal: scroll vertical aqui; páginas com lista interna (ex.: grade) seguem com flex-1 + overflow na própria lista */}
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto md:px-6 px-1 py-2">
        {children}
      </main>
    </div>
  )
}
