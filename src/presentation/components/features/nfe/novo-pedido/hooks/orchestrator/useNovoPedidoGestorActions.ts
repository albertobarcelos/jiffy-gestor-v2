'use client'

import { useCallback } from 'react'
import { atualizarPagamentoEntregaGestorUseCase } from '@/src/application/use-cases/vendas/AtualizarPagamentoEntregaGestorUseCase'
import { Produto } from '@/src/domain/entities/Produto'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import { showToast } from '@/src/shared/utils/toast'
import type {
  useCancelarNotaFiscalVendaGestor,
  useCancelarNotaFiscalVendaPdv,
  useCancelarVendaGestor,
} from '@/src/presentation/hooks/useVendas'
import type { Auth } from '@/src/domain/entities/Auth'

type AuthState = Auth | null
import type { FluxoPagamentoEntrega, PagamentoSelecionado } from '../../types'
import type { NovoPedidoFormState } from './useNovoPedidoFormState'
import type { ProdutosTabsModalState } from '@/src/presentation/components/features/produtos/ProdutosTabsModal'

type CancelarVendaGestor = ReturnType<typeof useCancelarVendaGestor>
type CancelarNotaPdv = ReturnType<typeof useCancelarNotaFiscalVendaPdv>
type CancelarNotaGestor = ReturnType<typeof useCancelarNotaFiscalVendaGestor>

export type UseNovoPedidoGestorActionsParams = {
  vendaId: string | undefined
  tabelaOrigemVenda: 'venda' | 'venda_gestor'
  onSuccess: () => void
  onClose: () => void
  auth: AuthState
  cancelarVendaGestor: CancelarVendaGestor
  cancelarNotaFiscalVendaPdv: CancelarNotaPdv
  cancelarNotaFiscalVendaGestor: CancelarNotaGestor
  form: Pick<
    NovoPedidoFormState,
    | 'produtos'
    | 'pagamentos'
    | 'setPagamentos'
    | 'fluxoPagamentoEntrega'
    | 'justificativaCancelamento'
    | 'tipoCancelamentoSelecionado'
    | 'setModalCancelarVendaOpen'
    | 'setJustificativaCancelamento'
    | 'setTipoCancelamentoSelecionado'
    | 'setProdutoTabsModalState'
    | 'setIsSavingPagamentoEntrega'
  >
  setInternalDialogOpen: (open: boolean) => void
  totalProdutos: number
  totalPagamentosLancados: number
  trocoLancamento: number
}

export function useNovoPedidoGestorActions({
  vendaId,
  tabelaOrigemVenda,
  onSuccess,
  onClose,
  auth,
  cancelarVendaGestor,
  cancelarNotaFiscalVendaPdv,
  cancelarNotaFiscalVendaGestor,
  form,
  setInternalDialogOpen,
  totalProdutos,
  totalPagamentosLancados,
  trocoLancamento,
}: UseNovoPedidoGestorActionsParams) {
  const {
    produtos,
    pagamentos,
    setPagamentos,
    fluxoPagamentoEntrega,
    justificativaCancelamento,
    tipoCancelamentoSelecionado,
    setModalCancelarVendaOpen,
    setJustificativaCancelamento,
    setTipoCancelamentoSelecionado,
    setProdutoTabsModalState,
    setIsSavingPagamentoEntrega,
  } = form

  const buildPagamentosPatchMeiosPayload = useCallback(
    (pagamentosBase: PagamentoSelecionado[]) =>
      pagamentosBase.map(p => ({
        meioPagamentoId: p.meioPagamentoId,
        valor: p.valor,
      })),
    []
  )

  const handleSalvarPagamentoEntregaEmAberto = useCallback(async () => {
    if (!vendaId || tabelaOrigemVenda !== 'venda_gestor') return
    if (pagamentos.length === 0) {
      showToast.error('Informe pelo menos uma forma de pagamento para cobrança.')
      return
    }

    const token = auth?.getAccessToken()
    if (!token) {
      showToast.error('Token não encontrado. Faça login novamente.')
      return
    }

    const pagamentosPayload = buildPagamentosPatchMeiosPayload(pagamentos)
    const diferencaPagamentoEntrega = totalProdutos - totalPagamentosLancados
    const pagamentoEntregaQuitado = diferencaPagamentoEntrega <= 0.01
    const pagamentoEntregaComTrocoValido =
      totalPagamentosLancados > totalProdutos && trocoLancamento > 0

    if (!pagamentoEntregaQuitado && !pagamentoEntregaComTrocoValido) {
      showToast.error(
        `Valor das formas de pagamento (${transformarParaReal(totalPagamentosLancados)}) não cobre o total do pedido (${transformarParaReal(totalProdutos)}).`
      )
      return
    }

    setIsSavingPagamentoEntrega(true)
    try {
      await atualizarPagamentoEntregaGestorUseCase.execute(
        vendaId,
        token,
        pagamentosPayload
      )

      setPagamentos(prev =>
        prev.map(p => ({
          ...p,
          cobrarNaEntrega: fluxoPagamentoEntrega === 'cobrar_entregador',
        }))
      )
      showToast.success('Cobrança da entrega atualizada.')
      onSuccess()
    } catch (error) {
      console.error('Erro ao atualizar pagamento da entrega:', error)
      showToast.error(error instanceof Error ? error.message : 'Erro ao atualizar pagamento')
    } finally {
      setIsSavingPagamentoEntrega(false)
    }
  }, [
    vendaId,
    tabelaOrigemVenda,
    pagamentos,
    auth,
    fluxoPagamentoEntrega,
    trocoLancamento,
    totalPagamentosLancados,
    buildPagamentosPatchMeiosPayload,
    totalProdutos,
    onSuccess,
    setPagamentos,
    setIsSavingPagamentoEntrega,
  ])

  const handleAbrirEdicaoProdutoDetalhes = useCallback(
    (produtoId: string | null | undefined) => {
      const id = String(produtoId || '').trim()
      if (!id) {
        showToast.error('Não foi possível abrir a edição: produto sem ID.')
        return
      }
      const produtoPedido = produtos.find(p => p.produtoId === id)
      const produtoParaEditar = Produto.create(
        id,
        '',
        produtoPedido?.nome || 'Produto',
        produtoPedido?.valorUnitario || 0,
        true
      )
      setProdutoTabsModalState({
        open: true,
        tab: 'produto',
        mode: 'edit',
        produto: produtoParaEditar,
        initialStepProduto: 2,
      })
    },
    [produtos, setProdutoTabsModalState]
  )

  const handleFecharProdutoTabsModal = useCallback(() => {
    setProdutoTabsModalState((prev: ProdutosTabsModalState) => ({ ...prev, open: false }))
  }, [setProdutoTabsModalState])

  const handleTabChangeProdutoModal = useCallback(
    (tab: 'produto' | 'complementos' | 'impressoras' | 'grupo') => {
      setProdutoTabsModalState((prev: ProdutosTabsModalState) => ({ ...prev, tab }))
    },
    [setProdutoTabsModalState]
  )

  const handleConfirmarCancelamentoVenda = useCallback(async () => {
    if (!vendaId) return

    if (justificativaCancelamento.trim().length < 15) {
      showToast.error('Justificativa deve ter no mínimo 15 caracteres')
      return
    }

    try {
      if (tipoCancelamentoSelecionado === 'venda') {
        await cancelarVendaGestor.mutateAsync({
          id: vendaId,
          motivo: justificativaCancelamento.trim(),
        })
      } else if (tabelaOrigemVenda === 'venda_gestor') {
        await cancelarNotaFiscalVendaGestor.mutateAsync({
          id: vendaId,
          justificativa: justificativaCancelamento.trim(),
        })
      } else {
        await cancelarNotaFiscalVendaPdv.mutateAsync({
          id: vendaId,
          justificativa: justificativaCancelamento.trim(),
        })
      }
      setModalCancelarVendaOpen(false)
      setJustificativaCancelamento('')
      setTipoCancelamentoSelecionado('venda')
      setInternalDialogOpen(false)
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Erro ao cancelar venda:', error)
    }
  }, [
    vendaId,
    justificativaCancelamento,
    tipoCancelamentoSelecionado,
    tabelaOrigemVenda,
    cancelarVendaGestor,
    cancelarNotaFiscalVendaGestor,
    cancelarNotaFiscalVendaPdv,
    setModalCancelarVendaOpen,
    setJustificativaCancelamento,
    setTipoCancelamentoSelecionado,
    setInternalDialogOpen,
    onSuccess,
    onClose,
  ])

  const atualizarPagamento = useCallback(
    (index: number, valor: number) => {
      setPagamentos(prev => {
        const novos = [...prev]
        novos[index] = { ...novos[index], valor }
        return novos
      })
    },
    [setPagamentos]
  )

  return {
    handleSalvarPagamentoEntregaEmAberto,
    handleAbrirEdicaoProdutoDetalhes,
    handleFecharProdutoTabsModal,
    handleTabChangeProdutoModal,
    handleConfirmarCancelamentoVenda,
    atualizarPagamento,
  }
}
