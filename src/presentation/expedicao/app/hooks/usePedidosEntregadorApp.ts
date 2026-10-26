'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  buscarItensPedidoApp,
  buscarPedidoResumoApp,
  confirmarEntregaPedido,
  listarMeiosPagamentoEntregaApp,
  listarPedidosAtivosEntregador,
  mesclarPedidoPegoNaLista,
  type MeioPagamentoAppEntregador,
  type PedidoResumoAppEntregador,
} from '@/src/presentation/expedicao/app/api/expedicaoAppApi'
import type { PeriodoComissaoEntregador } from '@/src/application/expedicao/app/periodoComissaoEntregador'
import {
  montarPagamentosDasLinhasFinalizarApp,
  type LinhaPagamentoFinalizarApp,
} from '@/src/application/expedicao/app/pagamentoFinalizarEntregaApp'
import { avisoApp } from '@/src/presentation/expedicao/app/avisoApp'

export function usePedidosEntregadorApp(input: {
  entregadorId: string | null
  tokenAtual: () => string | null
  periodo: PeriodoComissaoEntregador
  onEntregaConfirmada: (periodo: PeriodoComissaoEntregador) => Promise<void>
}) {
  const { entregadorId, tokenAtual, periodo, onEntregaConfirmada } = input
  const [pedidos, setPedidos] = useState<PedidoResumoAppEntregador[]>([])
  const [carregandoPedidos, setCarregandoPedidos] = useState(false)
  const [atualizandoPedidos, setAtualizandoPedidos] = useState(false)
  const [erroPedidos, setErroPedidos] = useState<string | null>(null)
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null)
  const [pedidoAbertoId, setPedidoAbertoId] = useState<string | null>(null)
  const [itensAberto, setItensAberto] = useState<Array<{ id: string; nome: string; quantidade: number }>>([])
  const [carregandoItens, setCarregandoItens] = useState(false)
  const [confirmarId, setConfirmarId] = useState<string | null>(null)
  const [meiosPagamento, setMeiosPagamento] = useState<MeioPagamentoAppEntregador[]>([])
  const jaCarregouPedidos = useRef(false)

  const carregarPedidos = useCallback(
    async (opcoes?: { silencioso?: boolean }) => {
      const token = tokenAtual()
      if (!token || !entregadorId) return
      const silencioso = Boolean(opcoes?.silencioso && jaCarregouPedidos.current)
      if (silencioso) setAtualizandoPedidos(true)
      else setCarregandoPedidos(true)
      setErroPedidos(null)
      try {
        setPedidos(await listarPedidosAtivosEntregador({ token, entregadorId }))
        jaCarregouPedidos.current = true
      } catch (error) {
        const mensagem = error instanceof Error ? error.message : 'Não foi possível carregar os pedidos.'
        setErroPedidos(mensagem)
        if (!jaCarregouPedidos.current) {
          avisoApp.error(mensagem)
        }
      } finally {
        setCarregandoPedidos(false)
        setAtualizandoPedidos(false)
      }
    },
    [entregadorId, tokenAtual]
  )

  useEffect(() => {
    if (!entregadorId) return
    void carregarPedidos()
  }, [carregarPedidos, entregadorId])

  const incluirPedidoPego = useCallback(
    async (pedidoId: string) => {
      const token = tokenAtual()
      if (!token || !entregadorId) return
      const pego = await buscarPedidoResumoApp({ token, pedidoId })
      const pegoDoEntregador =
        pego && (pego.entregadorId === entregadorId || !pego.entregadorId)
          ? { ...pego, entregadorId, etapa: pego.etapa || 'PRONTO' }
          : pego
      setPedidos(prev => mesclarPedidoPegoNaLista(prev, pegoDoEntregador))
      jaCarregouPedidos.current = true
    },
    [entregadorId, tokenAtual]
  )

  useEffect(() => {
    const token = tokenAtual()
    if (!token || !entregadorId) {
      setMeiosPagamento([])
      return
    }
    let cancelado = false
    void listarMeiosPagamentoEntregaApp(token)
      .then(lista => {
        if (!cancelado) setMeiosPagamento(lista)
      })
      .catch(() => {
        if (!cancelado) setMeiosPagamento([])
      })
    return () => {
      cancelado = true
    }
  }, [entregadorId, tokenAtual])

  const abrirPedido = useCallback(async (pedidoId: string) => {
    setPedidoAbertoId(pedidoId)
    setItensAberto([])
    const token = tokenAtual()
    if (!token) return
    setCarregandoItens(true)
    try {
      setItensAberto(await buscarItensPedidoApp({ token, pedidoId }))
    } catch (error) {
      avisoApp.error(error instanceof Error ? error.message : 'Não foi possível carregar os itens.')
    } finally {
      setCarregandoItens(false)
    }
  }, [tokenAtual])

  const confirmarEntrega = useCallback(
    async (pedidoId: string, linhas?: LinhaPagamentoFinalizarApp[]) => {
      const token = tokenAtual()
      if (!token) {
        avisoApp.error('Sessão da loja expirada.')
        return false
      }
      const pedido = pedidos.find(p => p.id === pedidoId)
      const pagamentos = pedido
        ? montarPagamentosDasLinhasFinalizarApp({
            cobrancas: pedido.cobrancas ?? [],
            linhas: linhas ?? [],
            valorFinal: pedido.valorFinal,
            faltaPagar: pedido.faltaPagar,
          })
        : null
      setConfirmandoId(pedidoId)
      try {
        await confirmarEntregaPedido({ token, pedidoId, pagamentos })
        await carregarPedidos({ silencioso: true })
        await onEntregaConfirmada(periodo)
        setConfirmarId(null)
        setPedidoAbertoId(null)
        return true
      } catch (error) {
        avisoApp.error(error instanceof Error ? error.message : 'Não foi possível confirmar a entrega.')
        return false
      } finally {
        setConfirmandoId(null)
      }
    },
    [carregarPedidos, onEntregaConfirmada, periodo, pedidos, tokenAtual]
  )

  const resetarPedidos = useCallback(() => {
    setPedidos([])
    setErroPedidos(null)
    setPedidoAbertoId(null)
    setConfirmarId(null)
    jaCarregouPedidos.current = false
  }, [])

  return {
    pedidos,
    carregandoPedidos,
    atualizandoPedidos,
    erroPedidos,
    confirmandoId,
    pedidoAbertoId,
    setPedidoAbertoId,
    itensAberto,
    carregandoItens,
    confirmarId,
    setConfirmarId,
    meiosPagamento,
    carregarPedidos,
    incluirPedidoPego,
    abrirPedido,
    confirmarEntrega,
    resetarPedidos,
  }
}
