'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSuperficieQuadroPedidos } from '@/src/presentation/gestor-pedidos/kiosk/useSuperficieQuadroPedidos'
import {
  gravarSomPedidosSilenciado,
  lerSomPedidosSilenciado,
  prepararSomPedidoNovo,
} from '@/src/presentation/gestor-pedidos/som/somPedidoNovo'
import { obterAlarmeSomPedidoNovo } from '@/src/presentation/gestor-pedidos/som/alarmeSomPedidoNovo'

/** Ícone silenciar/ativar na toolbar do Fredy. */
export function useFredySomPedidoNovo() {
  const superficie = useSuperficieQuadroPedidos()
  const [silenciado, setSilenciado] = useState(false)

  useEffect(() => {
    setSilenciado(lerSomPedidosSilenciado())
  }, [])

  const alternarSilenciado = useCallback(() => {
    setSilenciado(prev => {
      const next = !prev
      gravarSomPedidosSilenciado(next)
      const alarme = obterAlarmeSomPedidoNovo()
      if (next) {
        alarme.pararPorSilencio()
      } else {
        prepararSomPedidoNovo()
        alarme.retomarAposSomLigado()
      }
      return next
    })
  }, [])

  return {
    ativoNoFredy: superficie === 'fredy',
    silenciado,
    alternarSilenciado,
  }
}
