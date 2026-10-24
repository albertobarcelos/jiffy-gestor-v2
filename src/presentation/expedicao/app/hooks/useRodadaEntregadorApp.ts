'use client'

import { useCallback, useRef, useState } from 'react'
import type { PedidoLeituraExpedicao } from '@/src/application/expedicao/avaliarPedidoParaRodada'
import {
  adicionarPedidoNaRodada,
  expedirPedidosDaRodada,
} from '@/src/presentation/expedicao/app/api/expedicaoAppApi'
import { showToast } from '@/src/shared/utils/toast'

export type TelaApp = 'abas' | 'rodada' | 'checklist'

export function useRodadaEntregadorApp(input: {
  entregadorId: string | null
  tokenAtual: () => string | null
  onExpedida: () => Promise<void>
}) {
  const { entregadorId, tokenAtual, onExpedida } = input
  const [tela, setTela] = useState<TelaApp>('abas')
  const [rodada, setRodada] = useState<PedidoLeituraExpedicao[]>([])
  const [avisosRodada, setAvisosRodada] = useState<Array<{ codigo: string; motivo: string }>>([])
  const [indiceChecklist, setIndiceChecklist] = useState(0)
  const [marcados, setMarcados] = useState<Record<string, boolean>>({})
  const [expedindo, setExpedindo] = useState(false)
  const [pegando, setPegando] = useState(false)
  const [scannerAberto, setScannerAberto] = useState(false)
  const pegandoRef = useRef(false)

  const limparRodada = useCallback(() => {
    setRodada([])
    setAvisosRodada([])
    setIndiceChecklist(0)
    setMarcados({})
    setTela('abas')
  }, [])

  const pegarPedido = useCallback(
    async (codigoVenda: string) => {
      if (pegandoRef.current || !entregadorId) return
      const token = tokenAtual()
      if (!token) {
        showToast.error('Sessão da loja expirada.')
        throw new Error('Sessão da loja expirada.')
      }
      if (rodada.some(p => p.codigoVenda === codigoVenda)) {
        showToast.success('Pedido já está na lista.')
        setScannerAberto(false)
        setTela('rodada')
        return
      }
      pegandoRef.current = true
      setPegando(true)
      try {
        const pedido = await adicionarPedidoNaRodada({
          token,
          codigoVenda,
          entregadorId,
        })
        setRodada(prev => [...prev, pedido])
        setScannerAberto(false)
        setTela('rodada')
      } catch (error) {
        const motivo = error instanceof Error ? error.message : 'Não foi possível pegar o pedido.'
        setAvisosRodada(prev => [{ codigo: codigoVenda, motivo }, ...prev].slice(0, 6))
        setScannerAberto(false)
        setTela('rodada')
        showToast.error(motivo)
        throw error
      } finally {
        pegandoRef.current = false
        setPegando(false)
      }
    },
    [entregadorId, rodada, tokenAtual]
  )

  const expedirRodada = useCallback(async () => {
    if (!entregadorId || rodada.length === 0) return
    const token = tokenAtual()
    if (!token) {
      showToast.error('Sessão da loja expirada.')
      return
    }
    setExpedindo(true)
    try {
      const falhas = await expedirPedidosDaRodada({
        token,
        entregadorId,
        pedidos: rodada,
      })
      if (falhas.length === 0) {
        showToast.success(rodada.length === 1 ? 'Pedido expedido.' : `${rodada.length} pedidos expedidos.`)
        limparRodada()
        await onExpedida()
        return
      }
      const okIds = new Set(
        rodada.filter(p => !falhas.some(f => f.codigo === p.codigoVenda)).map(p => p.id)
      )
      setRodada(prev => prev.filter(p => !okIds.has(p.id)))
      setAvisosRodada(falhas)
      setTela('rodada')
      showToast.error('Alguns pedidos não saíram. Veja o aviso na lista.')
    } finally {
      setExpedindo(false)
    }
  }, [entregadorId, limparRodada, onExpedida, rodada, tokenAtual])

  return {
    tela,
    setTela,
    rodada,
    avisosRodada,
    indiceChecklist,
    setIndiceChecklist,
    marcados,
    setMarcados,
    expedindo,
    pegando,
    scannerAberto,
    setScannerAberto,
    limparRodada,
    pegarPedido,
    expedirRodada,
  }
}
