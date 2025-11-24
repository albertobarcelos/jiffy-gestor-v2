'use client'

import { ProdutosList } from '@/src/presentation/components/features/produtos/ProdutosList'

/**
 * Página de produtos
 * Replica exatamente o design do Flutter ProdutosScrollWidget
 * Client Component para evitar RSC overhead e melhorar performance
 */
export default function ProdutosPage() {
  return (
    <div className="h-full">
      <ProdutosList />
    </div>
  )
}

