'use client'

import type { UIEvent } from 'react'
import type { Produto } from '@/src/domain/entities/Produto'
import { PEDIDO_CATALOGO_GRADE_CLASS } from './pedidoCatalogoLayout'
import { PedidoCatalogoProdutoBotao } from './PedidoCatalogoProdutoBotao'

const SCROLL_PROXIMA_PAGINA_PX = 160

type PedidoCatalogoGradeProps = {
  produtos: Produto[]
  corHex: string
  onSelect: (produtoId: string) => void
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
  onLoadMore?: () => void
}

export function PedidoCatalogoGrade({
  produtos,
  corHex,
  onSelect,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: PedidoCatalogoGradeProps) {
  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    if (!hasNextPage || isFetchingNextPage || !onLoadMore) return
    const el = event.currentTarget
    if (el.scrollHeight - el.scrollTop - el.clientHeight > SCROLL_PROXIMA_PAGINA_PX) return
    onLoadMore()
  }

  return (
    <div
      className={`scrollbar-thin ${PEDIDO_CATALOGO_GRADE_CLASS} overflow-y-auto`}
      onScroll={handleScroll}
    >
      {produtos.map(produto => (
        <div key={produto.getId()} className="min-w-0">
          <PedidoCatalogoProdutoBotao produto={produto} corHex={corHex} onSelect={onSelect} />
        </div>
      ))}
    </div>
  )
}
