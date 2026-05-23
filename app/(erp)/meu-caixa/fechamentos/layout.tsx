'use client'

import { Header } from '@/src/presentation/components/layouts/Header'

/** Cabeçalho de fechamentos; TopNav vem do `ErpAppShell`. */
export default function FechamentosLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Header nomePagina="Fechamentos" />
      <div className="min-h-0 flex-1 overflow-y-auto p-6">{children}</div>
    </div>
  )
}
