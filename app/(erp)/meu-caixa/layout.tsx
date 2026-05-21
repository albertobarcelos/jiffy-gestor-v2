'use client'

import { Header } from '@/src/presentation/components/layouts/Header'

/** Cabeçalho da seção; TopNav vem do `ErpAppShell`. */
export default function MeuCaixaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Header nomePagina="Meu Caixa" />
      <div className="min-h-0 flex-1 overflow-y-auto p-6">{children}</div>
    </div>
  )
}
