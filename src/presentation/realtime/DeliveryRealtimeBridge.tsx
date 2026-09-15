'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useImpressaoDelivery } from '@/features/delivery/hooks/useImpressaoDelivery'
import {
  aplicarPedidoDeliveryCriadoNoKanbanCache,
  aplicarPedidoDeliveryStatusAlteradoNoKanbanCache,
} from '@/features/kanban/utils/kanbanDeliveryColumnCache'
import {
  connectDeliverySocket,
  disconnectDeliverySocket,
} from '@/src/infrastructure/realtime/deliverySocketClient'
import { getEstacaoImpressaoId } from '@/src/infrastructure/printing/estacaoImpressaoStorage'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { createDebouncedKanbanInvalidator } from '@/src/presentation/realtime/debouncedInvalidateKanban'
import {
  DELIVERY_REALTIME_EVENTS,
  isPedidoDeliveryImpressaoSolicitadaPayload,
} from '@/src/shared/realtime/deliveryRealtimeEvents'
import type { Socket } from 'socket.io-client'

/**
 * Mantem Socket.IO delivery enquanto a sessao ERP estiver ativa.
 * So escuta - mutacoes e impressao fisica ficam no HTTP / agente local.
 */
export function DeliveryRealtimeBridge() {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()
  const tenantAuth = useAuthStore(s => s.tenantAuth)
  const { imprimirPorComandoRealtime } = useImpressaoDelivery()
  const [estacaoId, setEstacaoId] = useState<string | null>(() => getEstacaoImpressaoId())
  const socketRef = useRef<Socket | null>(null)
  const imprimirRef = useRef(imprimirPorComandoRealtime)
  const invalidateDebouncedRef = useRef(createDebouncedKanbanInvalidator())

  useEffect(() => {
    imprimirRef.current = imprimirPorComandoRealtime
  }, [imprimirPorComandoRealtime])

  useEffect(() => {
    const invalidator = invalidateDebouncedRef.current
    return () => invalidator.cancel()
  }, [])

  const syncEstacaoId = useCallback(() => {
    setEstacaoId(getEstacaoImpressaoId())
  }, [])

  useEffect(() => {
    syncEstacaoId()
    const onChanged = () => syncEstacaoId()
    window.addEventListener('jiffy:estacao-impressao-changed', onChanged)
    window.addEventListener('storage', onChanged)
    return () => {
      window.removeEventListener('jiffy:estacao-impressao-changed', onChanged)
      window.removeEventListener('storage', onChanged)
    }
  }, [syncEstacaoId])

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
      console.info('[delivery-realtime] PEDIDO_DELIVERY_CRIADO')
      const aplicado = aplicarPedidoDeliveryCriadoNoKanbanCache(queryClient, payload)
      if (!aplicado) {
        console.warn(
          '[delivery-realtime] PEDIDO_DELIVERY_CRIADO sem summary utilizavel; fallback invalidate'
        )
        scheduleInvalidate()
      }
    })

    socket.on(DELIVERY_REALTIME_EVENTS.PEDIDO_DELIVERY_STATUS_ALTERADO, payload => {
      console.info('[delivery-realtime] PEDIDO_DELIVERY_STATUS_ALTERADO')
      const aplicado = aplicarPedidoDeliveryStatusAlteradoNoKanbanCache(queryClient, payload)
      if (!aplicado) {
        console.warn(
          '[delivery-realtime] PEDIDO_DELIVERY_STATUS_ALTERADO sem summary utilizavel; fallback invalidate'
        )
        scheduleInvalidate()
      }
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

    return () => {
      disconnectDeliverySocket(socket)
      if (socketRef.current === socket) socketRef.current = null
    }
  }, [empresaId, estacaoId, queryClient, tenantAuth])

  return null
}
