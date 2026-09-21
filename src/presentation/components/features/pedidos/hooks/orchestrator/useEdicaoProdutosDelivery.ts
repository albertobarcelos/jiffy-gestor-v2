'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { montarDiffProdutosPedidoDelivery } from '@/src/application/delivery/montarDiffProdutosPedidoDelivery'
import { atualizarProdutosPedidoDeliveryUseCase } from '@/src/infrastructure/composition/pedidoUseCases'
import type { ProdutoSelecionado } from '../../types'
import { validarObservacoesPedido } from '@/src/shared/helpers/observacaoPedido'
import { showToast } from '@/src/shared/utils/toast'

export interface UseEdicaoProdutosDeliveryParams {
  /** Liga o modo edição de produtos (botão "Editar produtos" do card). */
  ativo: boolean
  vendaId?: string
  getToken: () => string | null | undefined
  produtos: ProdutoSelecionado[]
  observacaoPedido: string
  /** Muda a cada nova carga do detalhe — usado para capturar o snapshot original uma vez. */
  vendaDataUpdatedAt?: number
  onSuccess: () => void
  onClose: () => void
  setInternalDialogOpen: (open: boolean) => void
  /**
   * Quando true, salvar/cancelar não fecha o painel (volta ao detalhe).
   * Usado ao editar itens a partir da aba Lista Produtos.
   */
  permanecerNoPainel?: boolean
  restaurarProdutos?: (produtos: ProdutoSelecionado[]) => void
}

/**
 * Encapsula a edição de produtos de um pedido delivery já existente:
 * captura o snapshot original carregado e, ao salvar, envia o diff add/remove via PATCH.
 */
export function useEdicaoProdutosDelivery({
  ativo,
  vendaId,
  getToken,
  produtos,
  observacaoPedido,
  vendaDataUpdatedAt,
  onSuccess,
  onClose,
  setInternalDialogOpen,
  permanecerNoPainel = false,
  restaurarProdutos,
}: UseEdicaoProdutosDeliveryParams) {
  const useCase = atualizarProdutosPedidoDeliveryUseCase
  const [salvandoProdutos, setSalvandoProdutos] = useState(false)

  // Snapshot dos produtos como vieram do detalhe (base para o diff).
  const produtosOriginaisRef = useRef<ProdutoSelecionado[] | null>(null)
  const updatedAtCapturadoRef = useRef<number | undefined>(undefined)

  const produtosRef = useRef(produtos)
  produtosRef.current = produtos
  const observacaoRef = useRef(observacaoPedido)
  observacaoRef.current = observacaoPedido

  useEffect(() => {
    if (!ativo) {
      produtosOriginaisRef.current = null
      updatedAtCapturadoRef.current = undefined
      return
    }
    // Captura uma vez por carga, apenas quando os produtos já foram aplicados ao formulário.
    if (
      vendaDataUpdatedAt &&
      vendaDataUpdatedAt !== updatedAtCapturadoRef.current &&
      produtos.length > 0
    ) {
      updatedAtCapturadoRef.current = vendaDataUpdatedAt
      produtosOriginaisRef.current = produtos.map(p => ({
        ...p,
        complementos: p.complementos.map(c => ({ ...c })),
      }))
    }
  }, [ativo, vendaDataUpdatedAt, produtos])

  const handleSalvarProdutos = useCallback(async () => {
    if (!ativo || salvandoProdutos) return
    const pedidoId = vendaId?.trim()
    const token = getToken()?.trim()
    if (!pedidoId || !token) {
      showToast.error('Não foi possível identificar o pedido para salvar os produtos.')
      return
    }

    const originais = produtosOriginaisRef.current
    if (!originais) {
      showToast.error('Aguarde o carregamento dos produtos antes de salvar.')
      return
    }

    const validacaoObservacoes = validarObservacoesPedido({
      produtos: produtosRef.current,
    })
    if (!validacaoObservacoes.ok) {
      showToast.error(validacaoObservacoes.message)
      return
    }

    const diff = montarDiffProdutosPedidoDelivery(originais, produtosRef.current)

    if (diff.algumOriginalSemId) {
      showToast.error('Não foi possível identificar os itens do pedido. Recarregue e tente novamente.')
      return
    }
    if (diff.resultariaSemProdutos) {
      showToast.error('O pedido precisa ter pelo menos um produto.')
      return
    }
    if (!diff.alterou) {
      showToast.info('Nenhuma alteração nos produtos.')
      onClose()
      return
    }

    setSalvandoProdutos(true)
    try {
      await useCase.execute({ pedidoId, token, add: diff.add, remove: diff.remove })
      showToast.success('Produtos atualizados com sucesso!')
      if (permanecerNoPainel) {
        onSuccess()
        return
      }
      setInternalDialogOpen(false)
      onSuccess()
      onClose()
    } catch (error: unknown) {
      console.error('Erro ao atualizar produtos do pedido delivery:', error)
      const err = error as {
        message?: string
        response?: { data?: { message?: string; error?: string } }
      }
      showToast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          'Erro ao atualizar produtos do pedido.'
      )
    } finally {
      setSalvandoProdutos(false)
    }
  }, [
    ativo,
    salvandoProdutos,
    vendaId,
    getToken,
    useCase,
    onSuccess,
    onClose,
    setInternalDialogOpen,
    permanecerNoPainel,
  ])

  const handleCancelarEdicao = useCallback(() => {
    const originais = produtosOriginaisRef.current
    if (originais && restaurarProdutos) {
      restaurarProdutos(
        originais.map(p => ({
          ...p,
          complementos: p.complementos.map(c => ({ ...c })),
        }))
      )
    }
    onClose()
  }, [onClose, restaurarProdutos])

  return { salvandoProdutos, handleSalvarProdutos, handleCancelarEdicao }
}
