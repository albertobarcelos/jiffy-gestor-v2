'use client'

import { useState } from 'react'
import { showToast } from '@/src/shared/utils/toast'
import { useNovoPedidoFormContext } from '../context/NovoPedidoFormContext'
import { useNovoPedidoDetalheContext } from '../context/NovoPedidoDetalheContext'
import { PedidoCarrinhoCabecalho } from './carrinho/PedidoCarrinhoCabecalho'
import { PedidoCarrinhoLinhaProduto } from './carrinho/PedidoCarrinhoLinhaProduto'
import { PedidoCarrinhoObservacaoTotal } from './carrinho/PedidoCarrinhoObservacaoTotal'
import {
  PedidoCarrinhoRemoverDialog,
  type ProdutoPendendoRemocao,
} from './carrinho/PedidoCarrinhoRemoverDialog'
import { PedidoCarrinhoVazio } from './carrinho/PedidoCarrinhoVazio'

export function PedidoProdutosCarrinhoColuna() {
  const {
    produtos,
    observacaoPedido,
    setObservacaoPedido,
    removerProduto,
    subtotalProdutos,
    totalProdutos,
    valorTaxaEntrega,
  } = useNovoPedidoFormContext()
  const { modoEdicaoProdutos } = useNovoPedidoDetalheContext()

  const [observacaoPedidoVisivel, setObservacaoPedidoVisivel] = useState(
    () => observacaoPedido.trim().length > 0
  )
  const [produtoPendendoRemocao, setProdutoPendendoRemocao] =
    useState<ProdutoPendendoRemocao | null>(null)

  const pedirRemocao = (item: ProdutoPendendoRemocao) => {
    if (modoEdicaoProdutos) {
      const ativos = produtos.filter(produto => !produto.removido)
      if (ativos.length <= 1) {
        showToast.error('O pedido precisa ter pelo menos um produto.')
        return
      }
    }
    setProdutoPendendoRemocao(item)
  }

  return (
    <>
      <div className="flex min-h-0 min-w-0 flex-[5] basis-0 flex-col gap-2">
        <div className="scrollbar-thin flex min-h-0 flex-1 flex-col overflow-y-auto rounded-lg border bg-gray-50">
          {produtos.length > 0 ? (
            <div className="p-2">
              <PedidoCarrinhoCabecalho />
              <div className="space-y-1">
                {produtos.map((produto, index) => (
                  <PedidoCarrinhoLinhaProduto
                    key={index}
                    produto={produto}
                    index={index}
                    onPedirRemocao={pedirRemocao}
                  />
                ))}
              </div>
            </div>
          ) : (
            <PedidoCarrinhoVazio />
          )}
        </div>
        <PedidoCarrinhoObservacaoTotal
          temProdutos={produtos.length > 0}
          observacaoPedido={observacaoPedido}
          observacaoPedidoVisivel={observacaoPedidoVisivel}
          totalProdutos={totalProdutos}
          subtotalProdutos={subtotalProdutos}
          valorTaxaEntrega={valorTaxaEntrega}
          observacaoEditavel={!modoEdicaoProdutos}
          onObservacaoChange={setObservacaoPedido}
          onToggleObservacao={() => setObservacaoPedidoVisivel(visivel => !visivel)}
        />
      </div>
      <PedidoCarrinhoRemoverDialog
        produto={produtoPendendoRemocao}
        onOpenChange={open => {
          if (!open) setProdutoPendendoRemocao(null)
        }}
        onConfirm={() => {
          if (produtoPendendoRemocao == null) return
          if (modoEdicaoProdutos) {
            const ativos = produtos.filter(produto => !produto.removido)
            if (ativos.length <= 1) {
              showToast.error('O pedido precisa ter pelo menos um produto.')
              setProdutoPendendoRemocao(null)
              return
            }
          }
          removerProduto(produtoPendendoRemocao.index)
          setProdutoPendendoRemocao(null)
        }}
      />
    </>
  )
}
