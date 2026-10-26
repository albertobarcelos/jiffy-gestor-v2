'use client'

import { useCallback, useRef, useState } from 'react'
import type { PedidoLeituraExpedicao } from '@/src/application/expedicao/avaliarPedidoParaRodada'
import {
  expedirPedidosDaRodada,
  localizarPedidoParaRodada,
  sincronizarPedidoPegoNaRodada,
} from '@/src/presentation/expedicao/app/api/expedicaoAppApi'
import { avisoApp } from '@/src/presentation/expedicao/app/avisoApp'

export type TelaApp = 'abas' | 'rodada' | 'checklist'

export function useRodadaEntregadorApp(input: {
  entregadorId: string | null
  tokenAtual: () => string | null
  onExpedida: () => Promise<void>
  onPego: (pedidoId: string) => Promise<void>
}) {
  const { entregadorId, tokenAtual, onExpedida, onPego } = input
  const [tela, setTela] = useState<TelaApp>('abas')
  const [rodada, setRodada] = useState<PedidoLeituraExpedicao[]>([])
  const [avisosRodada, setAvisosRodada] = useState<Array<{ codigo: string; motivo: string }>>([])
  const [indiceChecklist, setIndiceChecklist] = useState(0)
  const [marcados, setMarcados] = useState<Record<string, boolean>>({})
  const [expedindo, setExpedindo] = useState(false)
  const [pegando, setPegando] = useState(false)
  const [sincronizandoIds, setSincronizandoIds] = useState<string[]>([])
  const [scannerAberto, setScannerAberto] = useState(false)
  const pegandoRef = useRef(false)
  const rodadaRef = useRef(rodada)
  const sincronizandoRef = useRef<string[]>([])
  rodadaRef.current = rodada

  const limparRodada = useCallback(() => {
    setRodada([])
    setAvisosRodada([])
    setIndiceChecklist(0)
    setMarcados({})
    setSincronizandoIds([])
    sincronizandoRef.current = []
    setTela('abas')
  }, [])

  const marcarSincronizando = useCallback((pedidoId: string, ativo: boolean) => {
    setSincronizandoIds(prev => {
      const next = ativo
        ? prev.includes(pedidoId) ? prev : [...prev, pedidoId]
        : prev.filter(id => id !== pedidoId)
      sincronizandoRef.current = next
      return next
    })
  }, [])

  const pegarPedido = useCallback(
    async (codigoVenda: string) => {
      if (pegandoRef.current) {
        throw new Error('Aguarde o pedido anterior.')
      }
      if (!entregadorId) {
        avisoApp.error('Entre com a senha do entregador para pegar o pedido.')
        throw new Error('Entregador não identificado.')
      }
      const token = tokenAtual()
      if (!token) {
        avisoApp.error('Sessão da loja expirada.')
        throw new Error('Sessão da loja expirada.')
      }
      if (
        rodadaRef.current.some(
          p => p.codigoVenda === codigoVenda || String(p.numeroVenda ?? '') === codigoVenda
        )
      ) {
        avisoApp.success('Pedido já está na lista.')
        setScannerAberto(false)
        setTela('rodada')
        const ja = rodadaRef.current.find(
          p => p.codigoVenda === codigoVenda || String(p.numeroVenda ?? '') === codigoVenda
        )
        if (ja) void onPego(ja.id)
        return
      }
      pegandoRef.current = true
      setPegando(true)
      try {
        const pedido = await localizarPedidoParaRodada({
          token,
          codigoVenda,
          entregadorId,
        })
        setRodada(prev => (prev.some(item => item.id === pedido.id) ? prev : [...prev, pedido]))
        setScannerAberto(false)
        setTela('rodada')
        avisoApp.success(`Pedido #${pedido.numeroVenda ?? pedido.codigoVenda} pego.`)
        pegandoRef.current = false
        setPegando(false)

        marcarSincronizando(pedido.id, true)
        void (async () => {
          try {
            const sincronizado = await sincronizarPedidoPegoNaRodada({
              token,
              pedido,
              entregadorId,
            })
            setRodada(prev =>
              prev.map(item => (item.id === sincronizado.id ? { ...item, ...sincronizado } : item))
            )
            void onPego(sincronizado.id)
          } catch (error) {
            const motivo =
              error instanceof Error ? error.message : 'Não foi possível sincronizar o pedido.'
            setRodada(prev => prev.filter(item => item.id !== pedido.id))
            setAvisosRodada(prev =>
              [{ codigo: pedido.codigoVenda || codigoVenda, motivo }, ...prev].slice(0, 6)
            )
            avisoApp.error(motivo)
          } finally {
            marcarSincronizando(pedido.id, false)
          }
        })()
      } catch (error) {
        const motivo = error instanceof Error ? error.message : 'Não foi possível pegar o pedido.'
        setAvisosRodada(prev => [{ codigo: codigoVenda, motivo }, ...prev].slice(0, 6))
        avisoApp.error(motivo)
        pegandoRef.current = false
        setPegando(false)
        throw error
      }
    },
    [entregadorId, marcarSincronizando, onPego, tokenAtual]
  )

  const expedirRodada = useCallback(async () => {
    if (!entregadorId || rodadaRef.current.length === 0) return
    if (sincronizandoRef.current.length > 0) {
      avisoApp.error('Aguarde sincronizar o pedido pego.')
      return
    }
    const token = tokenAtual()
    if (!token) {
      avisoApp.error('Sessão da loja expirada.')
      return
    }
    const pedidosSnapshot = [...rodadaRef.current]
    setExpedindo(true)
    limparRodada()
    avisoApp.success(
      pedidosSnapshot.length === 1
        ? 'Pedido saiu para entrega.'
        : `${pedidosSnapshot.length} pedidos saíram para entrega.`
    )
    void (async () => {
      try {
        const falhas = await expedirPedidosDaRodada({
          token,
          entregadorId,
          pedidos: pedidosSnapshot,
        })
        if (falhas.length === 0) {
          await onExpedida()
          return
        }
        const okIds = new Set(
          pedidosSnapshot
            .filter(p => !falhas.some(f => f.codigo === p.codigoVenda))
            .map(p => p.id)
        )
        const voltaram = pedidosSnapshot.filter(p => !okIds.has(p.id))
        setRodada(voltaram)
        setAvisosRodada(falhas)
        setTela('rodada')
        avisoApp.error('Alguns pedidos não saíram. Veja o aviso na lista.')
        await onExpedida()
      } catch (error) {
        setRodada(pedidosSnapshot)
        setTela('rodada')
        avisoApp.error(error instanceof Error ? error.message : 'Não foi possível sair para entrega.')
      } finally {
        setExpedindo(false)
      }
    })()
  }, [entregadorId, limparRodada, onExpedida, tokenAtual])

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
    sincronizandoIds,
    scannerAberto,
    setScannerAberto,
    limparRodada,
    pegarPedido,
    expedirRodada,
  }
}
