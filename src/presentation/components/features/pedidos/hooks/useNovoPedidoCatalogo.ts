'use client'

import { useState } from 'react'
import type { Produto } from '@/src/domain/entities/Produto'

export function useNovoPedidoCatalogo() {
  /**
   * Catálogo acumulado por id (grupos visitados no passo 2 + GET do produto do menu).
   * Desacopla ações da linha do `grupoSelecionadoId`.
   */
  const [catalogoProdutosPorId, setCatalogoProdutosPorId] = useState<Record<string, Produto>>({})

  return {
    catalogoProdutosPorId,
    setCatalogoProdutosPorId,
  }
}
