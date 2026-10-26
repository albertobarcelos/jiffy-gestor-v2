'use client'

import { useEffect, useRef } from 'react'
import { mapPedidoAppEntregador } from '@/src/application/expedicao/app/mapPedidoAppEntregador'
import { deveAvisarPedidoEntregador } from '@/src/application/expedicao/app/deveAvisarPedidoEntregador'
import { EVENTO_PEDIDO_DELIVERY_APP } from '@/src/shared/realtime/eventoPedidoDeliveryApp'
import { prepararSomLeituraExpedicao, tocarSomLeituraExpedicao } from '@/src/presentation/expedicao/app/som/somLeituraExpedicao'

function notificarPedido(titulo: string, corpo: string): void {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  try {
    new Notification(titulo, { body: corpo })
  } catch {
    /* iOS / contexto sem Notification */
  }
}

export function useExpedicaoAppRealtime(input: {
  habilitado: boolean
  entregadorId: string | null
  avisos: boolean
  idsAtuais: string[]
  onAtualizar: () => void
}): void {
  const idsRef = useRef(new Set(input.idsAtuais))
  const avisosRef = useRef(input.avisos)
  const onAtualizarRef = useRef(input.onAtualizar)
  idsRef.current = new Set(input.idsAtuais)
  avisosRef.current = input.avisos
  onAtualizarRef.current = input.onAtualizar

  useEffect(() => {
    if (!input.habilitado || !input.entregadorId) return
    const entregadorId = input.entregadorId

    const ouvir = (evento: Event) => {
      const payload = (evento as CustomEvent).detail
      const pedido = mapPedidoAppEntregador(payload)
      if (!pedido) return
      if (
        !deveAvisarPedidoEntregador({
          entregadorId,
          pedidoEntregadorId: pedido.entregadorId,
          etapa: pedido.etapa,
          pedidoId: pedido.id,
          idsJaVistos: idsRef.current,
        })
      ) {
        return
      }
      onAtualizarRef.current()
      if (!avisosRef.current) return
      prepararSomLeituraExpedicao()
      tocarSomLeituraExpedicao()
      const numero = pedido.numeroVenda ?? pedido.codigoVenda
      notificarPedido('Pedido pra você', `#${numero} · ${pedido.clienteNome}`)
    }

    window.addEventListener(EVENTO_PEDIDO_DELIVERY_APP, ouvir)
    return () => window.removeEventListener(EVENTO_PEDIDO_DELIVERY_APP, ouvir)
  }, [input.entregadorId, input.habilitado])
}
