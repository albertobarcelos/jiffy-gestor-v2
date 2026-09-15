'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import { usePreferenciasImpressaoDelivery } from '@/src/presentation/hooks/usePreferenciasImpressaoDelivery'
import { useMeiosPagamentoInfinite } from '@/src/presentation/hooks/useMeiosPagamento'
import {
  useEmitirNfeDelivery,
  useTransicaoPedidoDelivery,
} from '@/src/presentation/hooks/useVendas'
import { useEntregaTransicoesKanban } from '@/src/presentation/components/features/delivery/kanban-panels/useEntregaTransicoesKanban'
import { DeliveryConfiguracoesModal } from '@/src/presentation/components/features/delivery/configuracoes/DeliveryConfiguracoesModal'
import { KanbanVendaCard } from '@/src/presentation/components/features/kanban/components/KanbanVendaCard'
import { NovoPedidoModal } from '@/src/presentation/components/features/pedidos/NovoPedidoModal'
import { EmitirNfeModal } from '@/src/presentation/components/features/fiscal/EmitirNfeModal'
import { AlertaCbenefEmissaoDialog } from '@/src/presentation/components/features/fiscal/AlertaCbenefEmissaoDialog'
import { AtribuirEntregadorKanbanPainel } from '@/src/presentation/components/features/delivery/kanban-panels/AtribuirEntregadorKanbanPainel'
import { useKanbanModais } from '@/src/presentation/components/features/kanban/hooks/useKanbanModais'
import { useKanbanPreTransicao } from '@/src/presentation/components/features/kanban/hooks/useKanbanPreTransicao'
import { useKanbanEntregadorSync } from '@/src/presentation/components/features/kanban/hooks/useKanbanEntregadorSync'
import { useFiscalEmissaoKanban } from '@/src/presentation/components/features/kanban/hooks/useFiscalEmissaoKanban'
import {
  flattenPedidosDeliveryInfinite,
  pedidosDeliveryInfiniteQueryKey,
  usePedidosDeliveryInfinite,
} from '@/src/presentation/components/features/kanban/hooks/usePedidosDeliveryInfinite'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { intervaloPresetKanbanFiltroData } from '@/src/presentation/components/features/kanban/utils/kanbanFiltroDataPresets'
import { KANBAN_DELIVERY_DELTA_POLL_INTERVAL_MS } from '@/src/presentation/components/features/kanban/utils/kanbanVendasListagem'
import { getKanbanColumnsConfig } from '@/src/presentation/components/features/kanban/utils/kanbanColumnsConfig'
import {
  termoBuscaKanbanParaApi,
  vendaAtendeTelefoneBuscaKanban,
} from '@/src/presentation/components/features/kanban/rules/vendasKanban.rules'
import { invalidateKanbanVendasListagens } from '@/src/presentation/components/features/kanban/hooks/kanbanListagemQueryCache'
import { mesclarNomesMeiosPagamentoCache } from '@/src/infrastructure/api/meiosPagamentoNomeCache'
import type { ColunaKanbanId, KanbanColumn, Venda } from '@/src/presentation/components/features/kanban/types'
import { digitosTelefonePedidoWhatsApp } from './telefonePedidoWhatsApp'

type Props = {
  telefone: string
  clienteNome?: string
  onOverlayAberto?: (aberto: boolean) => void
}

export function WhatsAppPedidosHojeSection({ telefone, clienteNome, onOverlayAberto }: Props) {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()
  const { timezoneAgregacao, empresa } = useEmpresaMe()
  const { preferenciasImpressaoDelivery } = usePreferenciasImpressaoDelivery()
  const q = termoBuscaKanbanParaApi(telefone || clienteNome || '')
  const intervaloHoje = useMemo(
    () =>
      intervaloPresetKanbanFiltroData('hoje', timezoneAgregacao ?? '', {
        diaOperacionalFlow: true,
      }),
    [timezoneAgregacao]
  )
  const dataCriacaoInicial = intervaloHoje?.inicio.toISOString()
  const dataCriacaoFinal = intervaloHoje?.fim.toISOString()
  const enabled = Boolean(q)
  const pedidosParams = useMemo(
    () => ({
      q: q || undefined,
      dataCriacaoInicial,
      dataCriacaoFinal,
    }),
    [q, dataCriacaoInicial, dataCriacaoFinal]
  )

  const query = usePedidosDeliveryInfinite(pedidosParams, {
    enabled,
    refetchIntervalMs: enabled ? KANBAN_DELIVERY_DELTA_POLL_INTERVAL_MS : false,
    refetchOnWindowFocus: enabled,
  })

  const { data: meiosData } = useMeiosPagamentoInfinite({
    ativo: true,
    limit: 100,
    enabled,
  })
  const nomesMeiosPagamento = useMemo(() => {
    const mapa: Record<string, string> = {}
    for (const page of meiosData?.pages ?? []) {
      for (const meio of page.meiosPagamento) {
        mapa[meio.getId()] = meio.getNome()
      }
    }
    return mapa
  }, [meiosData])

  useEffect(() => {
    mesclarNomesMeiosPagamentoCache(nomesMeiosPagamento)
  }, [nomesMeiosPagamento])

  const vendasBrutas = useMemo(() => {
    const { items } = flattenPedidosDeliveryInfinite(query.data)
    return items.filter(v => !v.isCancelada())
  }, [query.data])

  const telefoneFiltro = digitosTelefonePedidoWhatsApp(telefone)
  const vendasFiltradas = useMemo(() => {
    let lista = vendasBrutas
    if (telefoneFiltro) {
      lista = lista.filter(v => vendaAtendeTelefoneBuscaKanban(v, telefoneFiltro))
    } else if (clienteNome?.trim()) {
      const nome = clienteNome.trim().toLowerCase()
      lista = lista.filter(v => (v.cliente?.nome ?? '').trim().toLowerCase().includes(nome))
    }
    return [...lista].sort((a, b) => {
      const da = new Date(a.dataCriacao ?? 0).getTime()
      const db = new Date(b.dataCriacao ?? 0).getTime()
      return db - da
    })
  }, [vendasBrutas, telefoneFiltro, clienteNome])

  const todasVendasCarregadasRef = useRef<Venda[]>(vendasFiltradas)
  todasVendasCarregadasRef.current = vendasFiltradas
  const entregadorPorVendaIdRef = useRef<Record<string, string>>({})

  const colunasPorId = useMemo(() => {
    const mapa = new Map<string, KanbanColumn>()
    for (const coluna of getKanbanColumnsConfig()) mapa.set(coluna.id, coluna)
    return mapa
  }, [])

  const modais = useKanbanModais('delivery')
  const preTransicao = useKanbanPreTransicao({
    isModoDeliveryKanban: true,
    infiniteQueryKey: pedidosDeliveryInfiniteQueryKey(pedidosParams, empresaId),
    todasVendasCarregadasRef,
    entregadorPorVendaIdRef,
    onPatchEntregadorPorVendaId: (vendaId, entregadorId) => {
      entregadorPorVendaIdRef.current = {
        ...entregadorPorVendaIdRef.current,
        [vendaId]: entregadorId,
      }
    },
    preferenciasImpressaoDelivery,
    empresa,
    onAbrirConfigImpressoraExpedicao: modais.abrirConfigImpressoraExpedicao,
  })

  const transicaoPedidoDelivery = useTransicaoPedidoDelivery({
    onPedidoTransicionado: (vendaId, resposta) => {
      preTransicao.sincronizarVendaAposTransicao(vendaId, resposta)
      void query.refetch()
      invalidateKanbanVendasListagens(queryClient)
    },
  })

  const {
    avancandoEtapaIds,
    etapaLocalPorVendaId,
    timestampsEtapaEntregaLocal,
    handleAvancarEtapa,
  } = useEntregaTransicoesKanban({
    executarTransicao: payload => transicaoPedidoDelivery.mutateAsync(payload),
    sincronizarVendaAposTransicao: preTransicao.sincronizarVendaAposTransicao,
    agendarSincronizacaoLista: (vendaId, colunaDestino, onRecovered) => {
      preTransicao.agendarSincronizacaoLista(vendaId, colunaDestino, () => {
        void query.refetch()
        onRecovered?.()
      })
    },
    onAfterTransicaoSucesso: ({ venda, acoesExecutadas, ticketsPreload }) => {
      void preTransicao.processarAposTransicoes(venda, acoesExecutadas, ticketsPreload, {
        omitirAvisoSemVinculoPc: true,
      })
      void query.refetch()
    },
    verificarImpressaoAntesTransicoes: preTransicao.verificarImpressaoAntesTransicoes,
    verificarEntregadorAntesDespachar: preTransicao.verificarEntregadorAntesDespachar,
    onEntregadorAusenteAoDespachar: (venda, colunaOrigem) =>
      modais.abrirEntregadorParaDespacho(venda, colunaOrigem),
    confirmarPagamentoAntesFinalizar: preTransicao.confirmarPagamentoAntesFinalizar,
    revalidarPagamentoAntesFinalizar: preTransicao.revalidarPagamentoAntesFinalizar,
  })

  const emitirNotaDelivery = useEmitirNfeDelivery()
  const [, setPrimeiroPorColuna] = useState<Record<string, string>>({})
  const { acaoFiscalEmAndamentoPorVenda, handleEmitirNfe, alertaCbenef, handleContinuarCbenefKanban, handleConfigurarCbenefKanban, handleCancelarCbenefKanban } = useFiscalEmissaoKanban({
    reemitirNfePdv: async () => undefined,
    reemitirNfeGestor: async () => undefined,
    emitirNotaPdv: async () => undefined,
    emitirNotaGestor: async () => undefined,
    emitirNotaDelivery: payload => emitirNotaDelivery.mutateAsync(payload),
    setPrimeiroPorColuna,
    setVendaSelecionadaParaEmissao: modais.setVendaSelecionadaParaEmissao,
    setSelectedVendaId: modais.setSelectedVendaId,
    setEmitirNfeModalOpen: modais.setEmitirNfeModalOpen,
  })

  const getEtapaKanbanParaExibicao = useCallback(
    (venda: Venda) => etapaLocalPorVendaId[venda.id] || venda.getEtapaKanban(),
    [etapaLocalPorVendaId]
  )

  const entregador = useKanbanEntregadorSync({
    modoKanbanVendas: 'delivery',
    isLoadingDelivery: query.isLoading,
    todasVendasCarregadas: vendasFiltradas,
    getEtapaKanbanParaExibicao,
    entregadorPorVendaIdRef,
  })

  const invalidarListas = useCallback(() => {
    void query.refetch()
    invalidateKanbanVendasListagens(queryClient)
  }, [query, queryClient])

  const [paineisCardAbertos, setPaineisCardAbertos] = useState(0)
  const onPainelCardAbertoChange = useCallback((aberto: boolean) => {
    setPaineisCardAbertos(n => Math.max(0, n + (aberto ? 1 : -1)))
  }, [])

  useEffect(() => {
    if (!enabled || !query.hasNextPage || query.isFetchingNextPage) return
    void query.fetchNextPage()
  }, [enabled, query.hasNextPage, query.isFetchingNextPage, query.fetchNextPage])

  useEffect(() => {
    const aberto =
      paineisCardAbertos > 0 ||
      Boolean(alertaCbenef) ||
      modais.novoPedidoModalVisualizacaoOpen ||
      modais.novoPedidoModalEdicaoProdutosOpen ||
      modais.emitirNfeModalOpen ||
      modais.deliveryConfiguracoesOpen ||
      Boolean(modais.despachoPendenteEntregador)
    onOverlayAberto?.(aberto)
    return () => onOverlayAberto?.(false)
  }, [
    alertaCbenef,
    paineisCardAbertos,
    modais.novoPedidoModalVisualizacaoOpen,
    modais.novoPedidoModalEdicaoProdutosOpen,
    modais.emitirNfeModalOpen,
    modais.deliveryConfiguracoesOpen,
    modais.despachoPendenteEntregador,
    onOverlayAberto,
  ])

  if (!enabled) {
    return (
      <p className="mt-2 text-xs text-secondary-text">
        Abra uma conversa para ver os pedidos de hoje.
      </p>
    )
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      {query.isLoading ? (
        <p className="text-xs text-secondary-text">A carregar pedidos de hoje…</p>
      ) : vendasFiltradas.length === 0 ? (
        <p className="text-xs text-secondary-text">Nenhum pedido hoje nesta conversa.</p>
      ) : (
        vendasFiltradas.map(venda => {
          const etapa = getEtapaKanbanParaExibicao(venda) as ColunaKanbanId
          const coluna = colunasPorId.get(etapa) ?? colunasPorId.get('NOVOS_PEDIDOS')!
          return (
            <article
              key={venda.id}
              className={`min-w-0 overflow-hidden rounded-xl border ${coluna.borderColor} shadow-sm ${coluna.color}`}
            >
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold text-primary-text">
                {coluna.icon}
                <span className="min-w-0 truncate">{coluna.title}</span>
              </div>
              <div className="border-t border-black/5 bg-white/90">
                <KanbanVendaCard
                  venda={venda}
                  column={coluna}
                  modoKanbanVendas="delivery"
                  acaoFiscalEmAndamentoPorVenda={acaoFiscalEmAndamentoPorVenda}
                  avancandoEtapaIds={avancandoEtapaIds}
                  timestampsEtapaEntregaLocal={timestampsEtapaEntregaLocal}
                  onViewDetails={modais.handleViewDetails}
                  onEditarProdutos={modais.handleEditarProdutos}
                  onAvancarEtapa={(vendaAtual, colunaAtual) =>
                    void handleAvancarEtapa(vendaAtual, colunaAtual)
                  }
                  onEmitirNfe={vendaAtual => void handleEmitirNfe(vendaAtual)}
                  onReimprimirCupomDelivery={(vendaAtual, colunaAtual) =>
                    preTransicao.reimprimirCupomEntrega(vendaAtual, colunaAtual)
                  }
                  entregadorVinculadoId={entregador.entregadorPorVendaId[venda.id] ?? null}
                  onEntregadorAtualizado={entregador.handleEntregadorAtualizado}
                  nomesMeiosPagamento={nomesMeiosPagamento}
                  arrastarDesabilitado
                  onPainelAbertoChange={onPainelCardAbertoChange}
                />
              </div>
            </article>
          )
        })
      )}

      {modais.pedidoVisualizacaoContext ? (
        <NovoPedidoModal
          open={modais.novoPedidoModalVisualizacaoOpen}
          onClose={() => modais.setNovoPedidoModalVisualizacaoOpen(false)}
          onAfterClose={() => modais.setPedidoVisualizacaoContext(null)}
          onSuccess={() => {
            modais.setNovoPedidoModalVisualizacaoOpen(false)
            invalidarListas()
          }}
          vendaId={modais.pedidoVisualizacaoContext.id}
          tabelaOrigemVenda={modais.pedidoVisualizacaoContext.tabelaOrigem}
          statusFiscalUnificado={modais.pedidoVisualizacaoContext.statusFiscal}
          tipoVendaGestor={modais.pedidoVisualizacaoContext.tipoVenda}
          tipoInicioPedido="entrega"
          abaDetalhesInicial={modais.pedidoVisualizacaoContext.abaDetalhesInicial}
          modoVisualizacao
          statusEtapaOperacionalHint={modais.pedidoVisualizacaoContext.statusEtapaOperacional}
          entregadorHint={modais.pedidoVisualizacaoContext.entregador}
        />
      ) : null}

      {modais.pedidoEdicaoProdutosContext ? (
        <NovoPedidoModal
          open={modais.novoPedidoModalEdicaoProdutosOpen}
          onClose={() => modais.setNovoPedidoModalEdicaoProdutosOpen(false)}
          onAfterClose={() => modais.setPedidoEdicaoProdutosContext(null)}
          onSuccess={() => {
            modais.setNovoPedidoModalEdicaoProdutosOpen(false)
            invalidarListas()
          }}
          vendaId={modais.pedidoEdicaoProdutosContext.id}
          tabelaOrigemVenda={modais.pedidoEdicaoProdutosContext.tabelaOrigem}
          statusFiscalUnificado={modais.pedidoEdicaoProdutosContext.statusFiscal}
          tipoVendaGestor={modais.pedidoEdicaoProdutosContext.tipoVenda}
          tipoInicioPedido="entrega"
          modoEdicaoProdutos
        />
      ) : null}

      {modais.vendaSelecionadaParaEmissao ? (
        <EmitirNfeModal
          open={modais.emitirNfeModalOpen}
          onClose={() => {
            modais.setEmitirNfeModalOpen(false)
            modais.setSelectedVendaId(null)
            modais.setVendaSelecionadaParaEmissao(null)
          }}
          vendaId={modais.vendaSelecionadaParaEmissao.id}
          vendaNumero={modais.vendaSelecionadaParaEmissao.numeroVenda?.toString()}
          origemVenda={modais.vendaSelecionadaParaEmissao.origemVenda}
          codigoVenda={modais.vendaSelecionadaParaEmissao.codigoVenda}
          clienteId={modais.vendaSelecionadaParaEmissao.clienteId}
          clienteNome={modais.vendaSelecionadaParaEmissao.clienteNome}
          tabelaOrigem={modais.vendaSelecionadaParaEmissao.tabelaOrigem}
          tipoVenda={modais.vendaSelecionadaParaEmissao.tipoVenda}
          onClienteSalvo={invalidarListas}
        />
      ) : null}

      <AtribuirEntregadorKanbanPainel
        key={
          modais.despachoPendenteEntregador
            ? `despacho-entregador-${modais.despachoPendenteEntregador.venda.id}`
            : 'despacho-entregador-fechado'
        }
        open={Boolean(modais.despachoPendenteEntregador)}
        venda={modais.despachoPendenteEntregador?.venda ?? null}
        entregadorVinculadoId={
          modais.despachoPendenteEntregador
            ? entregador.entregadorPorVendaId[modais.despachoPendenteEntregador.venda.id] ?? null
            : null
        }
        modoDespacho
        onClose={() => modais.setDespachoPendenteEntregador(null)}
        onSalvo={(vendaId, entregadorId) => {
          entregador.handleEntregadorAtualizado(vendaId, entregadorId)
          modais.setDespachoPendenteEntregador(null)
        }}
      />

      <DeliveryConfiguracoesModal
        open={modais.deliveryConfiguracoesOpen}
        onClose={() => modais.setDeliveryConfiguracoesOpen(false)}
      />

      <AlertaCbenefEmissaoDialog
        open={Boolean(alertaCbenef)}
        itens={alertaCbenef?.itens ?? []}
        onContinuar={handleContinuarCbenefKanban}
        onConfigurar={handleConfigurarCbenefKanban}
        onCancelar={handleCancelarCbenefKanban}
      />
    </div>
  )
}
