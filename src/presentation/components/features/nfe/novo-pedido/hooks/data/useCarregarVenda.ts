'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import type { VendaDetalheCarregadaDTO } from '@/src/application/dto/VendaDetalheCarregadaDTO'
import { CarregarVendaDetalheUseCase } from '@/src/application/use-cases/vendas/CarregarVendaDetalheUseCase'
import type {
  DetalhesEntregaPedido,
  DetalhesPedidoMeta,
  FluxoPagamentoEntrega,
  OrigemVenda,
  PagamentoSelecionado,
  ProdutoSelecionado,
  ResumoFinanceiroDetalhes,
  ResumoFiscalVenda,
  StatusVenda,
} from '../../types'
import { showToast } from '@/src/shared/utils/toast'

export interface AplicarVendaDetalheHandlers {
  setDetalhesPedidoMeta: (meta: DetalhesPedidoMeta | null) => void
  setResumoFiscal: (resumo: ResumoFiscalVenda | null) => void
  setStatusFiscalDetalhe: (status: string | null) => void
  setOrigem: (origem: OrigemVenda) => void
  setStatus: (status: StatusVenda) => void
  setClienteId: (id: string) => void
  setClienteNome: (nome: string) => void
  setDetalhesEntregaPedido: (
    value: DetalhesEntregaPedido | null | ((prev: DetalhesEntregaPedido | null) => DetalhesEntregaPedido | null)
  ) => void
  setDataVenda: (data: string) => void
  setValorFinalVenda: (valor: number | null) => void
  setDataFinalizacaoCarregada: (data: string | null) => void
  setVendaGestorJaCancelada: (cancelada: boolean) => void
  setProdutos: (produtos: ProdutoSelecionado[]) => void
  setResumoFinanceiroDetalhes: (resumo: ResumoFinanceiroDetalhes | null) => void
  setPagamentos: (pagamentos: PagamentoSelecionado[]) => void
  setFluxoPagamentoEntrega: (fluxo: FluxoPagamentoEntrega) => void
  setNomesUsuariosPedido: (map: Record<string, string>) => void
  setNomesMeiosPagamentoPedido: (map: Record<string, string>) => void
  setCurrentStep: (step: 1 | 2 | 3 | 4) => void
}

export function aplicarVendaDetalheCarregada(
  dto: VendaDetalheCarregadaDTO,
  handlers: AplicarVendaDetalheHandlers
): void {
  handlers.setDetalhesPedidoMeta(dto.detalhesPedidoMeta)
  handlers.setResumoFiscal(dto.resumoFiscal)
  handlers.setStatusFiscalDetalhe(dto.statusFiscal)

  if (dto.origem) {
    handlers.setOrigem(dto.origem)
  }
  handlers.setStatus(dto.status)

  if (dto.clienteId) {
    handlers.setClienteId(dto.clienteId)
  }
  if (dto.clienteNome) {
    handlers.setClienteNome(dto.clienteNome)
  }

  if (dto.detalhesEntregaPedido) {
    handlers.setDetalhesEntregaPedido(dto.detalhesEntregaPedido)
  } else {
    handlers.setDetalhesEntregaPedido(null)
  }

  if (dto.dataVenda) {
    handlers.setDataVenda(dto.dataVenda)
  }
  handlers.setValorFinalVenda(dto.valorFinalVenda)
  handlers.setDataFinalizacaoCarregada(dto.dataFinalizacaoCarregada)
  handlers.setVendaGestorJaCancelada(dto.vendaGestorJaCancelada)

  console.log('✅ Produtos mapeados:', dto.produtos)
  handlers.setProdutos(dto.produtos)
  handlers.setResumoFinanceiroDetalhes(dto.resumoFinanceiroDetalhes)
  handlers.setPagamentos(dto.pagamentos)
  handlers.setFluxoPagamentoEntrega(dto.fluxoPagamentoEntrega)
  handlers.setNomesUsuariosPedido(dto.nomesUsuariosPedido)
  handlers.setNomesMeiosPagamentoPedido(dto.nomesMeiosPagamentoPedido)

  if (dto.irParaStep4) {
    handlers.setCurrentStep(4)
  }
}

interface MeioPagamentoLike {
  getId(): string
  getNome(): string
}

export interface UseCarregarVendaParams {
  open: boolean
  vendaId?: string
  vendaIdCriada: string | null
  modoVisualizacao?: boolean
  tabelaOrigemVenda: 'venda' | 'venda_gestor'
  meiosPagamentoRef: React.RefObject<MeioPagamentoLike[]>
  getToken: () => string | null | undefined
  onClose: () => void
  handlers: AplicarVendaDetalheHandlers
}

export function useCarregarVenda({
  open,
  vendaId,
  vendaIdCriada,
  modoVisualizacao,
  tabelaOrigemVenda,
  meiosPagamentoRef,
  getToken,
  onClose,
  handlers,
}: UseCarregarVendaParams) {
  const [isLoadingVenda, setIsLoadingVenda] = useState(false)
  const useCase = useMemo(() => new CarregarVendaDetalheUseCase(), [])
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  const carregarVendaExistente = useCallback(
    async (vendaIdOverride?: string | null) => {
      const vendaIdParaCarregar = vendaIdOverride || vendaId || vendaIdCriada
      if (!vendaIdParaCarregar || !open) return

      const token = getToken()
      if (!token) {
        showToast.error('Token não encontrado')
        return
      }

      setIsLoadingVenda(true)
      handlersRef.current.setStatusFiscalDetalhe(null)

      try {
        const dto = await useCase.execute({
          vendaId: vendaIdParaCarregar,
          tabelaOrigemVenda,
          token,
          modoVisualizacao,
          meiosPagamentoCache: meiosPagamentoRef.current ?? [],
        })

        aplicarVendaDetalheCarregada(dto, handlersRef.current)
      } catch (error: unknown) {
        console.error('Erro ao carregar venda:', error)
        showToast.error(
          error instanceof Error ? error.message : 'Erro ao carregar dados da venda'
        )
        onCloseRef.current()
      } finally {
        setIsLoadingVenda(false)
      }
    },
    [vendaId, vendaIdCriada, open, modoVisualizacao, tabelaOrigemVenda, getToken, useCase, meiosPagamentoRef]
  )

  return {
    carregarVendaExistente,
    isLoadingVenda,
    setIsLoadingVenda,
  }
}
