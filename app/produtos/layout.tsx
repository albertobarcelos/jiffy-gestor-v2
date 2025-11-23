'use client'

import { usePathname } from 'next/navigation'
import { TopNav } from '@/src/presentation/components/layouts/TopNav'
import { Header } from '@/src/presentation/components/layouts/Header'

/**
 * Layout da página de produtos
 * Design minimalista e clean
 */
export default function ProdutosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  
  // Páginas que não devem ter o Header (elas têm header próprio)
  const hideHeader = pathname?.includes('/novo') || pathname?.includes('/editar') || pathname?.includes('/atualizar-preco')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navegação superior */}
      <TopNav />

      {/* Header condicional */}
      {!hideHeader && <Header pageName="Produtos" />}

      {/* Conteúdo principal */}
      <main className={`${hideHeader ? '' : 'p-6'}`}>
        {children}
      </main>
    </div>
  )
}
