'use client'

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useImpressaoDelivery } from '@/features/delivery/hooks/useImpressaoDelivery'
import { usePreferenciasImpressaoDelivery } from '@/src/presentation/hooks/usePreferenciasImpressaoDelivery'
import {
  aplicarPedidoDeliveryCriadoNoKanbanCache,
  aplicarPedidoDeliveryStatusAlteradoNoKanbanCache,
} from '@/features/kanban/utils/kanbanDeliveryColumnCache'
import {
  connectDeliverySocket,
  disconnectDeliverySocket,
} from '@/src/infrastructure/realtime/deliverySocketClient'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { listarEstacoesImpressao } from '@/src/infrastructure/api/estacoesImpressaoApi'
import { estacaoDestePcLocalStore } from '@/src/infrastructure/printing/EstacaoDestePcLocalStore'
import { useEstacaoDestePc } from '@/src/presentation/hooks/useEstacaoDestePc'
import { useEstacoesImpressao } from '@/src/presentation/hooks/useEstacaoImpressaoQueries'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { estaNoAppJiffyFlow } from '@/src/presentation/gestor-pedidos/kiosk/isKioskGestorPedidos'
import { prepararSomPedidoNovo } from '@/src/presentation/gestor-pedidos/som/somPedidoNovo'
import {
  obterAlarmeSomPedidoNovo,
  resolverModoSomPedidoNovo,
  sincronizarAlarmeSomComPedidoDelivery,
} from '@/src/presentation/gestor-pedidos/som/alarmeSomPedidoNovo'
import { extrairVendaUnificadaDeRespostaDeliverySummary } from '@/features/kanban/utils/kanbanVendaCacheUpdate'
import { createDebouncedKanbanInvalidator } from '@/src/presentation/realtime/debouncedInvalidateKanban'
import {
  decidirImpressaoExpedicaoNoPronto,
  deveImprimirCupomExpedicaoNesteCliente,
  lerResumoStatusDelivery,
} from '@/src/application/delivery/decidirImpressaoExpedicaoPorStatusPronto'
import { isSuperficieExpedicaoApp } from '@/src/application/expedicao/app/detectarSuperficieExpedicao'
import { showToast } from '@/src/shared/utils/toast'
import {
  DELIVERY_REALTIME_EVENTS,
  isPedidoDeliveryImpressaoSolicitadaPayload,
} from '@/src/shared/realtime/deliveryRealtimeEvents'
import { emitirPedidoDeliveryApp } from '@/src/shared/realtime/eventoPedidoDeliveryApp'
import type { Socket } from 'socket.io-client'

/**
 * Mantem Socket.IO delivery enquanto a sessao da loja estiver ativa.
 * So escuta. Cupom de preparo: PEDIDO_DELIVERY_IMPRESSAO_SOLICITADA.
 * Cupom de expedicao: STATUS_ALTERADO → PRONTO no PC com gestorDelivery.
 */
export function DeliveryRealtimeBridge() {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()
  const tenantAuth = useAuthStore(s => s.tenantAuth)
  const { imprimirPorComandoRealtime, imprimirCupomExpedicaoPorPronto } = useImpressaoDelivery()
  const { preferenciasImpressaoDelivery } = usePreferenciasImpressaoDelivery()
  const { estacaoId } = useEstacaoDestePc()
  const estacoesQuery = useEstacoesImpressao(Boolean(empresaId))
  const socketRef = useRef<Socket | null>(null)
  const imprimirRef = useRef(imprimirPorComandoRealtime)
  const imprimirExpedicaoRef = useRef(imprimirCupomExpedicaoPorPronto)
  const prefsRef = useRef(preferenciasImpressaoDelivery)
  const estacoesRef = useRef(estacoesQuery.data ?? [])
  const invalidateDebouncedRef = useRef(createDebouncedKanbanInvalidator())

  useEffect(() => {
    imprimirRef.current = imprimirPorComandoRealtime
  }, [imprimirPorComandoRealtime])

  useEffect(() => {
    imprimirExpedicaoRef.current = imprimirCupomExpedicaoPorPronto
  }, [imprimirCupomExpedicaoPorPronto])

  useEffect(() => {
    prefsRef.current = preferenciasImpressaoDelivery
  }, [preferenciasImpressaoDelivery])

  useEffect(() => {
    estacoesRef.current = estacoesQuery.data ?? []
  }, [estacoesQuery.data])

  useEffect(() => {
    const invalidator = invalidateDebouncedRef.current
    return () => invalidator.cancel()
  }, [])

  useEffect(() => {
    if (!estaNoAppJiffyFlow()) return
    const destravar = () => prepararSomPedidoNovo()
    window.addEventListener('pointerdown', destravar)
    window.addEventListener('keydown', destravar)
    return () => {
      window.removeEventListener('pointerdown', destravar)
      window.removeEventListener('keydown', destravar)
    }
  }, [])

  useEffect(() => {
    const token = tenantAuth?.getAccessToken()?.trim()
    if (!empresaId || !token) {
      disconnectDeliverySocket(socketRef.current)
      socketRef.current = null
      return
    }

    disconnectDeliverySocket(socketRef.current)
    console.info('[delivery-realtime] conectando', {
      empresaId,
      estacaoId: estacaoId ?? null,
      temEstacao: Boolean(estacaoId),
    })
    const socket = connectDeliverySocket(
      { token, estacaoId },
      {
        onConnect: () => {
          console.info('[delivery-realtime] conectado', {
            socketId: socket.id,
            estacaoId: estacaoId ?? null,
          })
        },
        onDisconnect: reason => {
          console.warn('[delivery-realtime] desconectado', reason)
        },
        onConnectError: error => {
          const anyErr = error as Error & {
            description?: unknown
            context?: unknown
          }
          console.warn('[delivery-realtime] connect_error', {
            message: anyErr.message,
            description: anyErr.description,
            context: anyErr.context,
          })
        },
      }
    )
    socketRef.current = socket
    const scheduleInvalidate = () => invalidateDebouncedRef.current.schedule(queryClient)

    socket.on(DELIVERY_REALTIME_EVENTS.PEDIDO_DELIVERY_CRIADO, payload => {
      emitirPedidoDeliveryApp(payload)
      console.info('[delivery-realtime] PEDIDO_DELIVERY_CRIADO')
      const aplicado = aplicarPedidoDeliveryCriadoNoKanbanCache(queryClient, payload)
      if (!aplicado) {
        console.warn(
          '[delivery-realtime] PEDIDO_DELIVERY_CRIADO sem summary utilizavel; fallback invalidate'
        )
        scheduleInvalidate()
      }
      const card = extrairVendaUnificadaDeRespostaDeliverySummary(payload)
      if (card && estaNoAppJiffyFlow()) {
        obterAlarmeSomPedidoNovo().onPedidoCriado(
          card.id,
          resolverModoSomPedidoNovo(card.getEtapaKanban())
        )
      }
    })

    socket.on(DELIVERY_REALTIME_EVENTS.PEDIDO_DELIVERY_STATUS_ALTERADO, payload => {
      emitirPedidoDeliveryApp(payload)
      console.info('[delivery-realtime] PEDIDO_DELIVERY_STATUS_ALTERADO')
      const aplicado = aplicarPedidoDeliveryStatusAlteradoNoKanbanCache(queryClient, payload)
      if (!aplicado) {
        console.warn(
          '[delivery-realtime] PEDIDO_DELIVERY_STATUS_ALTERADO sem summary utilizavel; fallback invalidate'
        )
        scheduleInvalidate()
      }
      const card = extrairVendaUnificadaDeRespostaDeliverySummary(payload)
      if (card && estaNoAppJiffyFlow()) {
        sincronizarAlarmeSomComPedidoDelivery({
          vendaId: card.id,
          etapaKanban: card.getEtapaKanban(),
          statusOperacional: card.statusEtapaOperacional,
        })
      }
      const resumo = lerResumoStatusDelivery(payload)
      const vendaId = resumo.vendaId ?? card?.id ?? null
      const statusDelivery = resumo.statusDelivery ?? card?.statusEtapaOperacional
      if (!vendaId) return
      void (async () => {
        const noAppEntregador = isSuperficieExpedicaoApp({
          pathname: window.location.pathname,
          search: window.location.search,
          host: window.location.host,
        })
        if (!deveImprimirCupomExpedicaoNesteCliente(noAppEntregador)) {
          console.info('[delivery-realtime] cupom de expedicao so no PC da receptora')
          return
        }
        const token = useAuthStore.getState().tenantAuth?.getAccessToken()
        const estacoesFrescas = token
          ? await listarEstacoesImpressao(token).catch(() => [])
          : []
        const estacoes = estacoesFrescas.length > 0 ? estacoesFrescas : estacoesRef.current
        const decisao = decidirImpressaoExpedicaoNoPronto({
          estacaoDestePcId: estacaoDestePcLocalStore.obterId(),
          estacoes,
          statusDelivery,
          prefs: prefsRef.current,
        })
        if (!decisao.imprimir) {
          console.info('[delivery-realtime] sem cupom de expedicao', {
            vendaId,
            statusDelivery,
            estacaoDestePc: estacaoDestePcLocalStore.obterId(),
            receptoraId: decisao.receptoraId,
            modo: prefsRef.current.modo,
            imprimirAoFicarPronto: prefsRef.current.imprimirAoFicarPronto,
          })
          return
        }
        const resultado = await imprimirExpedicaoRef.current(vendaId, decisao.receptoraId)
        console.info('[delivery-realtime] cupom expedicao no pronto', {
          vendaId,
          resultado,
          receptoraId: decisao.receptoraId,
        })
        if (resultado === 'erro_fetch' || resultado === 'sem_tickets') {
          showToast.error(
            resultado === 'sem_tickets'
              ? 'Pedido pronto, mas não havia cupom de expedição para imprimir.'
              : 'Pedido pronto, mas o cupom de expedição não imprimiu.'
          )
        }
      })()
    })

    socket.on(DELIVERY_REALTIME_EVENTS.PEDIDO_DELIVERY_IMPRESSAO_SOLICITADA, payload => {
      console.info('[delivery-realtime] PEDIDO_DELIVERY_IMPRESSAO_SOLICITADA', payload)
      if (!isPedidoDeliveryImpressaoSolicitadaPayload(payload)) {
        console.warn('[delivery-realtime] payload de impressao invalido', payload)
        return
      }
      void imprimirRef.current(payload.vendaId).then(resultado => {
        console.info('[delivery-realtime] impressao resultado', {
          vendaId: payload.vendaId,
          resultado,
        })
      })
    })

    const reconectarSeCaiu = () => {
      if (document.visibilityState !== 'visible') return
      if (socket.connected) return
      console.info('[delivery-realtime] reconectando apos foco')
      socket.connect()
    }
    window.addEventListener('focus', reconectarSeCaiu)
    document.addEventListener('visibilitychange', reconectarSeCaiu)

    return () => {
      window.removeEventListener('focus', reconectarSeCaiu)
      document.removeEventListener('visibilitychange', reconectarSeCaiu)
      disconnectDeliverySocket(socket)
      if (socketRef.current === socket) socketRef.current = null
    }
  }, [empresaId, estacaoId, queryClient, tenantAuth])

  return null
}
