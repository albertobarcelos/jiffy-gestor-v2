'use client'

import { useMemo, type HTMLAttributes } from 'react'
import { useNovoPedidoDetalheContext } from '../context/NovoPedidoDetalheContext'
import { useNovoPedidoFormContext } from '../context/NovoPedidoFormContext'
import { PedidoDetalhesInfo } from './PedidoDetalhesInfo'
import { PedidoEntregaDetalheConteudo } from './PedidoEntregaDetalheConteudo'

interface PedidoDetalhesEntregaProps extends HTMLAttributes<HTMLDivElement> {}

export function PedidoDetalhesEntrega({ className = '', ...props }: PedidoDetalhesEntregaProps) {
  const { detalhesEntregaPedido } = useNovoPedidoDetalheContext()
  const {
    clienteNome,
    entregadores,
    fluxoPagamentoEntrega,
    formatarUsuarioPorId,
    meiosPagamento,
    nomesMeiosPagamentoPedido,
    pagamentos,
    trocoLancamento,
    valorFinalVenda,
    totalProdutos,
    observacaoPedido,
  } = useNovoPedidoFormContext()

  const nomeEntregador = useMemo(() => {
    const nomePersistido = detalhesEntregaPedido?.entregadorNome?.trim()
    if (nomePersistido) return nomePersistido

    const id = detalhesEntregaPedido?.entregadorId
    if (!id) return '—'

    const daLista = entregadores?.find((e: { id: string }) => e.id === id)?.nome
    if (daLista) return daLista

    const viaMapaUsuarios = formatarUsuarioPorId(id)
    if (viaMapaUsuarios && viaMapaUsuarios !== id && !viaMapaUsuarios.startsWith('Usuário ')) {
      return viaMapaUsuarios
    }
    return '—'
  }, [
    detalhesEntregaPedido?.entregadorId,
    detalhesEntregaPedido?.entregadorNome,
    entregadores,
    formatarUsuarioPorId,
  ])

  const trocoExibicao = useMemo(() => {
    const trocoApi = detalhesEntregaPedido?.trocoApi
    if (trocoApi != null && trocoApi > 0) return trocoApi
    return trocoLancamento > 0 ? trocoLancamento : 0
  }, [detalhesEntregaPedido?.trocoApi, trocoLancamento])

  const valorPedido =
    valorFinalVenda != null && !Number.isNaN(Number(valorFinalVenda))
      ? Number(valorFinalVenda)
      : totalProdutos

  const nomesMeiosPagamento = useMemo(() => {
    const mapa: Record<string, string> = { ...(nomesMeiosPagamentoPedido ?? {}) }
    ;(meiosPagamento ?? []).forEach((meio: { getId(): string; getNome(): string }) => {
      const id = meio.getId()
      const nome = meio.getNome()?.trim()
      if (id && nome) mapa[id] = nome
    })
    return mapa
  }, [meiosPagamento, nomesMeiosPagamentoPedido])

  const pagamentosComNomes = useMemo(() => pagamentos ?? [], [pagamentos])

  return (
    <PedidoDetalhesInfo className={className} {...props}>
      <PedidoEntregaDetalheConteudo
        detalhesEntrega={detalhesEntregaPedido}
        clienteNome={clienteNome}
        fluxoPagamentoEntrega={fluxoPagamentoEntrega}
        pagamentos={pagamentosComNomes}
        nomesMeiosPagamento={nomesMeiosPagamento}
        valorPedido={valorPedido}
        nomeEntregador={nomeEntregador}
        trocoExibicao={trocoExibicao}
        observacaoPedido={observacaoPedido}
      />
    </PedidoDetalhesInfo>
  )
}
