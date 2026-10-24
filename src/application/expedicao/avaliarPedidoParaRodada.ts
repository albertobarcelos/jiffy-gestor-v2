import { EtapaOperacionalDelivery } from '@/src/domain/value-objects/EtapaOperacionalDelivery'

export type PedidoLeituraExpedicao = {
  id: string
  codigoVenda: string
  numeroVenda: number | null
  clienteNome: string
  bairro: string | null
  etapa: string | null
  entregadorId: string | null
  entregadorNome: string | null
  itens: Array<{ id: string; nome: string; quantidade: number }>
}

export type AvaliacaoPedidoRodada =
  | { ok: true }
  | { ok: false; motivo: string }

export function avaliarPedidoParaRodada(
  pedido: Pick<PedidoLeituraExpedicao, 'etapa' | 'entregadorId' | 'entregadorNome'>,
  entregadorAtualId: string
): AvaliacaoPedidoRodada {
  const etapa = EtapaOperacionalDelivery.tryParse(pedido.etapa)
  if (!etapa) {
    return { ok: false, motivo: 'Etapa do pedido não reconhecida.' }
  }
  if (etapa.isCancelado()) {
    return { ok: false, motivo: 'Pedido cancelado.' }
  }
  if (etapa.isFinalizado()) {
    return { ok: false, motivo: 'Pedido já finalizado.' }
  }
  if (etapa.valor === 'EM_ROTA') {
    const outro = String(pedido.entregadorId ?? '').trim()
    if (outro && outro !== entregadorAtualId) {
      const nome = pedido.entregadorNome?.trim()
      return {
        ok: false,
        motivo: nome ? `Já saiu com ${nome}.` : 'Já saiu com outro entregador.',
      }
    }
    return { ok: false, motivo: 'Pedido já está em rota.' }
  }
  if (etapa.valor === 'PENDENTE' || etapa.valor === 'EM_PREPARO' || etapa.valor === 'PRONTO') {
    return { ok: true }
  }
  return { ok: false, motivo: 'Pedido ainda não está pronto.' }
}
