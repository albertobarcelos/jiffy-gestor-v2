'use client'

import { Suspense } from 'react'
import { ProdutosList } from '@/src/presentation/components/features/produtos/ProdutosList'

/**
 * Página de produtos
 * Replica exatamente o design do Flutter ProdutosScrollWidget
 * Client Component para evitar RSC overhead e melhorar performance
 */
export default function ProdutosPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Suspense fallback={<div>Carregando produtos...</div>}>
        <ProdutosList />
      </Suspense>
    </div>
  )
}

