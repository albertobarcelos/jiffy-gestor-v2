'use client'

import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  atualizarCobrancasPedidoDeliveryUseCase,
  atualizarPagamentoEntregaGestorUseCase,
} from '@/src/infrastructure/composition/pedidoUseCases'
import { pagamentoEstaCancelado, divergenciaPagamentoVsTotalPedido } from '@/src/domain/services/pedido/RegrasPagamentoPedido'
import { pagamentosAtivosParaPatchDelivery } from '@/src/application/mappers/CobrancaPedidoDeliveryPayloadMapper'
import { Produto } from '@/src/domain/entities/Produto'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import { showToast } from '@/src/shared/utils/toast'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { invalidateVendaDetalheCarregadaCache } from '../data/useVendaDetalheCarregadaQuery'
import { invalidateKanbanVendasListagens } from '@/features/kanban/hooks/kanbanListagemQueryCache'
import type {
  useCancelarNotaFiscalVendaGestor,
  useCancelarNotaFiscalVendaPdv,
  useCancelarVendaGestor,
  useTransicaoPedidoDelivery,
} from '@/src/presentation/hooks/useVendas'
import type { FluxoPagamentoEntrega, PagamentoSelecionado } from '../../types'
import type { NovoPedidoFormState } from './useNovoPedidoFormState'
import type {
  ProdutosTabsModalState,
  ProdutosTabsTabKey,
} from '@/src/presentation/components/features/produtos/ProdutosTabsModal'

type CancelarVendaGestor = ReturnType<typeof useCancelarVendaGestor>
type CancelarNotaPdv = ReturnType<typeof useCancelarNotaFiscalVendaPdv>
type CancelarNotaGestor = ReturnType<typeof useCancelarNotaFiscalVendaGestor>
type TransicaoPedidoDelivery = ReturnType<typeof useTransicaoPedidoDelivery>

export type UseNovoPedidoGestorActionsParams = {
  vendaId: string | undefined
  tabelaOrigemVenda: 'venda' | 'venda_gestor'
  onSuccess: () => void
  onClose: () => void
  cancelarVendaGestor: CancelarVendaGestor
  cancelarNotaFiscalVendaPdv: CancelarNotaPdv
  cancelarNotaFiscalVendaGestor: CancelarNotaGestor
  transicaoPedidoDelivery: TransicaoPedidoDelivery
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
  /** Catálogo do pedido — traz grupoId/nomeGrupo que a linha do carrinho não tem. */
  catalogoProdutosPorId?: Record<string, Produto>
  produtosList?: Produto[]
  setInternalDialogOpen: (open: boolean) => void
  totalProdutos: number
  totalPagamentosLancados: number
  trocoLancamento: number
  usarModuloDeliveryCobrancas?: boolean
  recarregarVendaExistente?: () => Promise<unknown>
  /** Aberto pelo Kanban para quitar pagamento antes de finalizar. */
  confirmarPagamentoParaFinalizar?: boolean
  /** Após editar itens: o pagamento precisa conferir com o novo total. */
  ajustandoPagamentoAposEdicaoItens?: boolean
  onPagamentoEntregaSalvo?: () => void
}

export function useNovoPedidoGestorActions({
  vendaId,
  tabelaOrigemVenda,
  onSuccess,
  onClose,
  cancelarVendaGestor,
  cancelarNotaFiscalVendaPdv,
  cancelarNotaFiscalVendaGestor,
  transicaoPedidoDelivery,
  form,
  catalogoProdutosPorId = {},
  produtosList = [],
  setInternalDialogOpen,
  totalProdutos,
  totalPagamentosLancados,
  trocoLancamento,
  usarModuloDeliveryCobrancas = false,
  recarregarVendaExistente,
  confirmarPagamentoParaFinalizar = false,
  ajustandoPagamentoAposEdicaoItens = false,
  onPagamentoEntregaSalvo,
}: UseNovoPedidoGestorActionsParams) {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()
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

  const handleSalvarPagamentoEntregaEmAberto = useCallback(async () => {
    if (!vendaId || tabelaOrigemVenda !== 'venda_gestor') return

    const pagamentosAtivos = pagamentos.filter(p => !pagamentoEstaCancelado(p))
    if (pagamentosAtivos.length === 0) {
      showToast.error('Informe pelo menos uma forma de pagamento para cobrança.')
      return
    }

    const token = useAuthStore.getState().tenantAuth?.getAccessToken()
    if (!token) {
      showToast.error('Token não encontrado. Faça login novamente.')
      return
    }

    const pagamentosPayload = pagamentosAtivosParaPatchDelivery(pagamentos)
    const totalLancadoAtivos = pagamentosAtivos.reduce((sum, p) => sum + p.valor, 0)
    const { divergente, diferenca } = divergenciaPagamentoVsTotalPedido(
      totalProdutos,
      totalLancadoAtivos
    )
    const pagamentoEntregaQuitado = diferenca <= 0.01
    const pagamentoEntregaComTrocoValido =
      totalLancadoAtivos > totalProdutos && trocoLancamento > 0

    if (ajustandoPagamentoAposEdicaoItens && divergente && diferenca < 0 && !pagamentoEntregaComTrocoValido) {
      showToast.error(
        `O pagamento está ${transformarParaReal(Math.abs(diferenca))} acima do novo total. Ajuste as formas de pagamento.`
      )
      return
    }

    if (!pagamentoEntregaQuitado && !pagamentoEntregaComTrocoValido) {
      showToast.error(
        `Valor das formas de pagamento (${transformarParaReal(totalLancadoAtivos)}) não cobre o total do pedido (${transformarParaReal(totalProdutos)}).`
      )
      return
    }

    setIsSavingPagamentoEntrega(true)
    try {
      const fluxoParaPatch = usarModuloDeliveryCobrancas ? 'ja_pago' : fluxoPagamentoEntrega

      if (usarModuloDeliveryCobrancas) {
        const aplicado = await atualizarCobrancasPedidoDeliveryUseCase.execute(
          vendaId,
          token,
          pagamentos,
          fluxoParaPatch
        )
        if (!aplicado) {
          if (ajustandoPagamentoAposEdicaoItens && !divergente) {
            showToast.success('Cobrança conferida com o novo total.')
            onPagamentoEntregaSalvo?.()
            onSuccess()
            return
          }
          if (ajustandoPagamentoAposEdicaoItens) {
            showToast.error('Ajuste as formas de pagamento para o novo total antes de salvar.')
            return
          }
          showToast.info('Nenhuma alteração de cobrança para salvar.')
          return
        }
      } else {
        await atualizarPagamentoEntregaGestorUseCase.execute(
          vendaId,
          token,
          pagamentosPayload
        )
      }

      if (vendaId) {
        await invalidateVendaDetalheCarregadaCache(queryClient, empresaId, vendaId)
      }
      if (recarregarVendaExistente) {
        await recarregarVendaExistente()
      }

      showToast.success('Cobrança da entrega atualizada.')
      onPagamentoEntregaSalvo?.()
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
    fluxoPagamentoEntrega,
    trocoLancamento,
    totalProdutos,
    onSuccess,
    setIsSavingPagamentoEntrega,
    queryClient,
    empresaId,
    usarModuloDeliveryCobrancas,
    recarregarVendaExistente,
    ajustandoPagamentoAposEdicaoItens,
    onPagamentoEntregaSalvo,
  ])

  const handleAbrirEdicaoProdutoDetalhes = useCallback(
    (
      produtoId: string | null | undefined,
      options?: { initialStepProduto?: 0 | 1 | 2 }
    ) => {
      const id = String(produtoId || '').trim()
      if (!id) {
        showToast.error('Não foi possível abrir a edição: produto sem ID.')
        return
      }

      const doCatalogo =
        catalogoProdutosPorId[id] ?? produtosList.find(p => p.getId() === id)
      const produtoPedido = produtos.find(p => p.produtoId === id)

      const produtoParaEditar =
        doCatalogo ??
        Produto.create(
          id,
          '',
          produtoPedido?.nome || 'Produto',
          produtoPedido?.valorUnitario || 0,
          true
        )

      const grupoId =
        doCatalogo?.getGrupoId()?.trim() ||
        undefined

      setProdutoTabsModalState({
        open: true,
        tab: 'produto',
        mode: 'edit',
        produto: produtoParaEditar,
        grupoId,
        initialStepProduto: options?.initialStepProduto ?? 2,
      })
    },
    [produtos, catalogoProdutosPorId, produtosList, setProdutoTabsModalState]
  )

  const handleFecharProdutoTabsModal = useCallback(() => {
    setProdutoTabsModalState((prev: ProdutosTabsModalState) => ({ ...prev, open: false }))
  }, [setProdutoTabsModalState])

  const handleTabChangeProdutoModal = useCallback(
    (tab: ProdutosTabsTabKey) => {
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
      if (tipoCancelamentoSelecionado === 'pedido_delivery') {
        await transicaoPedidoDelivery.mutateAsync({
          id: vendaId,
          acao: 'cancelar',
          motivo: justificativaCancelamento.trim(),
        })
        showToast.success('Pedido cancelado com sucesso!')
      } else if (tipoCancelamentoSelecionado === 'venda') {
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
      invalidateKanbanVendasListagens(queryClient)
      await invalidateVendaDetalheCarregadaCache(queryClient, empresaId, vendaId)
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
    transicaoPedidoDelivery,
    cancelarNotaFiscalVendaGestor,
    cancelarNotaFiscalVendaPdv,
    setModalCancelarVendaOpen,
    setJustificativaCancelamento,
    setTipoCancelamentoSelecionado,
    setInternalDialogOpen,
    onSuccess,
    onClose,
    queryClient,
    empresaId,
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
