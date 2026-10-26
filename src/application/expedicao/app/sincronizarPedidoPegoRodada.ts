import type { PedidoLeituraExpedicao } from '@/src/application/expedicao/avaliarPedidoParaRodada'

type PedidoPegoSync = Pick<PedidoLeituraExpedicao, 'etapa' | 'entregadorId'>

function etapaNormalizada(etapa: string | null | undefined): string {
  return String(etapa ?? '').trim().toUpperCase()
}

/**
 * Já está PRONTO/EM_ROTA e vinculado a este entregador — não chama API de novo.
 * Usa o entregador original do pedido, não um id otimista da UI.
 */
export function pedidoJaSincronizadoNaRodada(
  pedido: PedidoPegoSync,
  entregadorId: string
): boolean {
  const etapa = etapaNormalizada(pedido.etapa)
  const jaMeu = String(pedido.entregadorId ?? '').trim() === entregadorId.trim()
  return jaMeu && (etapa === 'EM_ROTA' || etapa === 'PRONTO')
}

/** Depois do PRONTO+vínculo; EM_ROTA permanece. */
export function etapaAposSincronizarPego(etapa: string | null | undefined): string {
  const atual = etapaNormalizada(etapa)
  return atual === 'EM_ROTA' ? 'EM_ROTA' : 'PRONTO'
}

/** Lista da busca já dá para o card da rodada — evita GET detalhe. */
export function listaSuficienteParaCardRodada(
  pedido: Pick<PedidoLeituraExpedicao, 'itens' | 'endereco' | 'bairro'> | null
): boolean {
  if (!pedido) return false
  if (pedido.itens.length === 0) return false
  return Boolean(pedido.endereco || pedido.bairro)
}
