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
import { montarPagamentosAoTrocarMeioFinalizarApp } from '@/src/application/expedicao/app/pagamentoFinalizarEntregaApp'
import { showToast } from '@/src/shared/utils/toast'

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
          showToast.error(mensagem)
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
      const [pego, lista] = await Promise.all([
        buscarPedidoResumoApp({ token, pedidoId }),
        listarPedidosAtivosEntregador({ token, entregadorId }).catch(() => [] as PedidoResumoAppEntregador[]),
      ])
      const pegoDoEntregador =
        pego && (pego.entregadorId === entregadorId || !pego.entregadorId)
          ? { ...pego, entregadorId, etapa: pego.etapa || 'EM_ROTA' }
          : pego
      setPedidos(mesclarPedidoPegoNaLista(lista, pegoDoEntregador))
      jaCarregouPedidos.current = true
    },
    [entregadorId, tokenAtual]
  )

  useEffect(() => {
    if (!confirmarId) return
    const token = tokenAtual()
    if (!token) return
    void listarMeiosPagamentoEntregaApp(token)
      .then(setMeiosPagamento)
      .catch(() => setMeiosPagamento([]))
  }, [confirmarId, tokenAtual])

  const abrirPedido = useCallback(async (pedidoId: string) => {
    setPedidoAbertoId(pedidoId)
    setItensAberto([])
    const token = tokenAtual()
    if (!token) return
    setCarregandoItens(true)
    try {
      setItensAberto(await buscarItensPedidoApp({ token, pedidoId }))
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Não foi possível carregar os itens.')
    } finally {
      setCarregandoItens(false)
    }
  }, [tokenAtual])

  const confirmarEntrega = useCallback(
    async (pedidoId: string, meioPagamentoId?: string | null) => {
      const token = tokenAtual()
      if (!token) {
        showToast.error('Sessão da loja expirada.')
        return
      }
      const pedido = pedidos.find(p => p.id === pedidoId)
      const pagamentos = pedido
        ? montarPagamentosAoTrocarMeioFinalizarApp({
            cobrancas: pedido.cobrancas ?? [],
            meioPagamentoId: meioPagamentoId ?? null,
            valorFinal: pedido.valorFinal,
            faltaPagar: pedido.faltaPagar,
          })
        : null
      setConfirmandoId(pedidoId)
      try {
        await confirmarEntregaPedido({ token, pedidoId, pagamentos })
        showToast.success(
          pedido && pedido.faltaPagar > 0
            ? 'Pagamento recebido e entrega confirmada.'
            : 'Entrega confirmada.'
        )
        await carregarPedidos({ silencioso: true })
        await onEntregaConfirmada(periodo)
        setConfirmarId(null)
        setPedidoAbertoId(null)
      } catch (error) {
        showToast.error(error instanceof Error ? error.message : 'Não foi possível confirmar a entrega.')
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
