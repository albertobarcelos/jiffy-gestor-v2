'use client'

import { useState } from 'react'
import type { Produto } from '@/src/domain/entities/Produto'

export function useNovoPedidoCatalogo() {
  /**
   * Catálogo acumulado por id (todos os grupos visitados no passo 2 + GET /api/produtos/:id).
   * Desacopla ações da linha do `grupoSelecionadoId`.
   */
  const [catalogoProdutosPorId, setCatalogoProdutosPorId] = useState<Record<string, Produto>>({})

  return {
    catalogoProdutosPorId,
    setCatalogoProdutosPorId,
  }
}
