'use client'

import { PedidoProdutosCarrinhoColuna } from './PedidoProdutosCarrinhoColuna'
import { PedidoProdutosCatalogoColuna } from './PedidoProdutosCatalogoColuna'
import { PedidoProdutosCategoriasColuna } from './PedidoProdutosCategoriasColuna'

export function PedidoProdutosStepLayout() {
  return (
    <div className="flex min-h-0 flex-1 gap-2">
      <PedidoProdutosCategoriasColuna />
      <PedidoProdutosCatalogoColuna />
      <PedidoProdutosCarrinhoColuna />
    </div>
  )
}
