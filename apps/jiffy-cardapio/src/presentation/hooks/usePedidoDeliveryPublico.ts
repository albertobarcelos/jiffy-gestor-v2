'use client'

import { useEffect, useState } from 'react'
import type { PedidoPublicoConfirmadoView } from '@/src/application/mappers/PedidoPublicoConfirmadoMapper'
import { PublicDeliveryApiError } from '@/src/application/errors/publicDeliveryErrors'
import { consultarPedidoDeliveryPublicoUseCase } from '@/src/infrastructure/di/deliveryPublicoUseCases'

export type PedidoDeliveryPublicoStatus = 'loading' | 'ready' | 'not_found' | 'error'

const INTERVALO_ACOMPANHAMENTO_MS = 15_000

function acompanhamentoEncerrado(statusDelivery: PedidoPublicoConfirmadoView['statusDelivery']) {
  return statusDelivery === 'FINALIZADO' || statusDelivery === 'CANCELADO'
}

export function usePedidoDeliveryPublico(id: string) {
  const [pedido, setPedido] = useState<PedidoPublicoConfirmadoView | null>(null)
  const [status, setStatus] = useState<PedidoDeliveryPublicoStatus>('loading')
  const [mensagemErro, setMensagemErro] = useState<string | null>(null)

  useEffect(() => {
    const idNormalizado = id.trim()
    if (!idNormalizado) {
      setPedido(null)
      setMensagemErro(null)
      setStatus('not_found')
      return
    }

    let cancelado = false
    setStatus('loading')
    setMensagemErro(null)

    consultarPedidoDeliveryPublicoUseCase
      .execute(idNormalizado)
      .then(view => {
        if (cancelado) return
        setPedido(view)
        setStatus('ready')
      })
      .catch(error => {
        if (cancelado) return
        setPedido(null)
        if (error instanceof PublicDeliveryApiError && error.status === 404) {
          setStatus('not_found')
          return
        }
        setMensagemErro(
          error instanceof Error ? error.message : 'Não foi possível carregar o pedido'
        )
        setStatus('error')
      })

    return () => {
      cancelado = true
    }
  }, [id])

  const statusDelivery = pedido?.statusDelivery

  useEffect(() => {
    const idNormalizado = id.trim()
    if (status !== 'ready' || !statusDelivery || !idNormalizado) return
    if (acompanhamentoEncerrado(statusDelivery)) return

    let cancelado = false
    const timer = window.setInterval(() => {
      consultarPedidoDeliveryPublicoUseCase
        .execute(idNormalizado)
        .then(view => {
          if (cancelado) return
          setPedido(view)
        })
        .catch(error => {
          if (cancelado) return
          if (error instanceof PublicDeliveryApiError && error.status === 404) {
            setPedido(null)
            setStatus('not_found')
          }
        })
    }, INTERVALO_ACOMPANHAMENTO_MS)

    return () => {
      cancelado = true
      window.clearInterval(timer)
    }
  }, [id, status, statusDelivery])

  return { pedido, status, mensagemErro }
}
