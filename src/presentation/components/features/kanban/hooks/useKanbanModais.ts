'use client'

import { useCallback, useState } from 'react'
import type { TipoPedido } from '../../pedidos/components/EscolhaTipoPedidoModal'
import type { AbaDetalhesPedido } from '../../pedidos/types'
import type { VendaSelecionadaParaEmissao } from './useFiscalEmissaoKanban'
import type { ModoKanbanVendas } from '../KanbanModoVendasToggle'
import type { ColunaKanbanId, Venda } from '../types'

export function useKanbanModais(modoKanbanVendas: ModoKanbanVendas) {
  const [selectedVendaId, setSelectedVendaId] = useState<string | null>(null)
  const [vendaSelecionadaParaEmissao, setVendaSelecionadaParaEmissao] =
    useState<VendaSelecionadaParaEmissao | null>(null)
  const [emitirNfeModalOpen, setEmitirNfeModalOpen] = useState(false)

  const [novoPedidoModalOpen, setNovoPedidoModalOpen] = useState(false)
  const [deliveryConfiguracoesOpen, setDeliveryConfiguracoesOpen] = useState(false)
  const [novoPedidoCriarContext, setNovoPedidoCriarContext] = useState<{
    instanciaKey: number
    tipoInicioPedido: TipoPedido
  } | null>(null)

  const [novoPedidoModalVisualizacaoOpen, setNovoPedidoModalVisualizacaoOpen] = useState(false)
  const [pedidoVisualizacaoContext, setPedidoVisualizacaoContext] = useState<{
    id: string
    tabelaOrigem: 'venda' | 'venda_gestor'
    statusFiscal: Venda['statusFiscal']
    tipoVenda?: string | null
    abaDetalhesInicial?: AbaDetalhesPedido
    statusEtapaOperacional?: string | null
    entregador?: Venda['entregador']
  } | null>(null)

  const [novoPedidoModalEdicaoProdutosOpen, setNovoPedidoModalEdicaoProdutosOpen] = useState(false)
  const [pedidoEdicaoProdutosContext, setPedidoEdicaoProdutosContext] = useState<{
    id: string
    tabelaOrigem: 'venda' | 'venda_gestor'
    statusFiscal: Venda['statusFiscal']
    tipoVenda?: string | null
  } | null>(null)

  const handleAbrirNovoPedido = useCallback(() => {
    setNovoPedidoCriarContext({
      instanciaKey: Date.now(),
      tipoInicioPedido: modoKanbanVendas === 'delivery' ? 'entrega' : 'balcao',
    })
    setNovoPedidoModalOpen(true)
  }, [modoKanbanVendas])

  const handleViewDetails = useCallback((venda: Venda) => {
    setPedidoVisualizacaoContext({
      id: venda.id,
      tabelaOrigem: venda.tabelaOrigem,
      statusFiscal: venda.statusFiscal,
      tipoVenda: venda.tipoVenda,
      statusEtapaOperacional: venda.getEtapaKanban() || venda.statusEtapaOperacional,
      entregador: venda.entregador,
    })
    setNovoPedidoModalVisualizacaoOpen(true)
  }, [])

  const handleEditarProdutos = useCallback((venda: Venda) => {
    setPedidoEdicaoProdutosContext({
      id: venda.id,
      tabelaOrigem: venda.tabelaOrigem,
      statusFiscal: venda.statusFiscal,
      tipoVenda: venda.tipoVenda,
    })
    setNovoPedidoModalEdicaoProdutosOpen(true)
  }, [])

  const abrirDetalhesPagamentoPedido = useCallback((venda: Venda) => {
    setPedidoVisualizacaoContext({
      id: venda.id,
      tabelaOrigem: venda.tabelaOrigem,
      statusFiscal: venda.statusFiscal,
      tipoVenda: venda.tipoVenda,
      abaDetalhesInicial: 'pagamentos',
      statusEtapaOperacional: venda.getEtapaKanban() || venda.statusEtapaOperacional,
      entregador: venda.entregador,
    })
    setNovoPedidoModalVisualizacaoOpen(true)
  }, [])

  const abrirConfigImpressoraExpedicao = useCallback(() => {
    setDeliveryConfiguracoesOpen(true)
  }, [])

  const [despachoPendenteEntregador, setDespachoPendenteEntregador] = useState<{
    venda: Venda
    colunaAtual: ColunaKanbanId
  } | null>(null)

  const abrirEntregadorParaDespacho = useCallback((venda: Venda, colunaAtual: ColunaKanbanId) => {
    setDespachoPendenteEntregador({ venda, colunaAtual })
  }, [])

  return {
    selectedVendaId,
    setSelectedVendaId,
    vendaSelecionadaParaEmissao,
    setVendaSelecionadaParaEmissao,
    emitirNfeModalOpen,
    setEmitirNfeModalOpen,
    novoPedidoModalOpen,
    setNovoPedidoModalOpen,
    deliveryConfiguracoesOpen,
    setDeliveryConfiguracoesOpen,
    novoPedidoCriarContext,
    setNovoPedidoCriarContext,
    novoPedidoModalVisualizacaoOpen,
    setNovoPedidoModalVisualizacaoOpen,
    pedidoVisualizacaoContext,
    setPedidoVisualizacaoContext,
    novoPedidoModalEdicaoProdutosOpen,
    setNovoPedidoModalEdicaoProdutosOpen,
    pedidoEdicaoProdutosContext,
    setPedidoEdicaoProdutosContext,
    handleAbrirNovoPedido,
    handleViewDetails,
    handleEditarProdutos,
    abrirDetalhesPagamentoPedido,
    abrirConfigImpressoraExpedicao,
    despachoPendenteEntregador,
    setDespachoPendenteEntregador,
    abrirEntregadorParaDespacho,
  }
}
