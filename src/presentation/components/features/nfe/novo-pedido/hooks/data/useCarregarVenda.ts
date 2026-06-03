'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { VendaDetalheCarregadaDTO } from '@/src/application/dto/VendaDetalheCarregadaDTO'
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
import { useVendaDetalheCarregadaQuery } from './useVendaDetalheCarregadaQuery'

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
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers
  const getTokenRef = useRef(getToken)
  getTokenRef.current = getToken
  const ultimoDtoAplicadoRef = useRef<string | null>(null)
  const [dadosVendaAplicados, setDadosVendaAplicados] = useState(false)

  const vendaIdParaCarregar = vendaId || vendaIdCriada || ''
  const queryEnabled = open && !!vendaIdParaCarregar

  const query = useVendaDetalheCarregadaQuery({
    vendaId: vendaIdParaCarregar,
    tabelaOrigemVenda,
    modoVisualizacao: Boolean(modoVisualizacao),
    token: getTokenRef.current(),
    enabled: queryEnabled,
    meiosPagamentoCache: meiosPagamentoRef.current ?? [],
  })

  useLayoutEffect(() => {
    if (!open) {
      ultimoDtoAplicadoRef.current = null
      setDadosVendaAplicados(false)
      return
    }
    if (!query.data) return

    const chaveAplicacao = `${vendaIdParaCarregar}:${query.dataUpdatedAt}`
    if (ultimoDtoAplicadoRef.current === chaveAplicacao) return
    ultimoDtoAplicadoRef.current = chaveAplicacao

    aplicarVendaDetalheCarregada(query.data, handlersRef.current)
    setDadosVendaAplicados(true)
  }, [open, query.data, query.dataUpdatedAt, vendaIdParaCarregar])

  useEffect(() => {
    if (!open || !query.isError || !query.error) return
    console.error('Erro ao carregar venda:', query.error)
    showToast.error(
      query.error instanceof Error ? query.error.message : 'Erro ao carregar dados da venda'
    )
    onCloseRef.current()
  }, [open, query.isError, query.error])

  useEffect(() => {
    if (query.isFetching && !query.data && open && vendaIdParaCarregar) {
      handlersRef.current.setStatusFiscalDetalhe(null)
    }
  }, [query.isFetching, query.data, open, vendaIdParaCarregar])

  const carregarVendaExistente = useCallback(async () => {
    if (!vendaIdParaCarregar || !open) return
    await query.refetch()
  }, [vendaIdParaCarregar, open, query])

  /** Bloqueia UI até o DTO estar no formulário; reabertura com cache evita novas requisições. */
  const isLoadingVenda = queryEnabled && !dadosVendaAplicados

  return {
    carregarVendaExistente,
    isLoadingVenda,
    setIsLoadingVenda: () => {},
  }
}
