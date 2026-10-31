'use client'

import { Suspense } from 'react'
import { PizzasHubPage } from '@/src/presentation/components/features/pizza/PizzasHubPage'

export default function ProdutosPizzasPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <Suspense fallback={<div className="p-6">Carregando pizzas...</div>}>
        <PizzasHubPage />
      </Suspense>
    </div>
  )
}
