'use client'

import { GruposProdutosList } from '@/src/presentation/components/features/grupos-produtos/GruposProdutosList'

/**
 * Página de grupos de produtos
 * Client Component para evitar RSC overhead e melhorar performance
 */
export default function GruposProdutosPage() {
  return (
    <div className="h-full">
      <GruposProdutosList />
    </div>
  )
}

