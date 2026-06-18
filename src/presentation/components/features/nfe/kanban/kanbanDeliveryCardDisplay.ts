import { formatarHoraPrevisaoEntrega } from '@/src/application/mappers/PedidoDisplayMapper'
import type { FluxoPagamentoEntrega } from '@/src/domain/types/vendaDetalhe'
import type {
  CobrancaKanbanDeliveryResumo,
  VendaUnificadaDTO,
} from '@/src/presentation/hooks/useVendasUnificadas'

/** Hora ou minutos previstos para exibição compacta no card delivery. */
export function formatarPrevisaoEntregaKanbanCard(venda: VendaUnificadaDTO): string | null {
  const previsao = venda.previsaoEntregaEm?.trim()
  if (previsao) {
    const hora = formatarHoraPrevisaoEntrega(previsao, venda.dataCriacao)
    return hora !== '—' ? hora : null
  }

  const segundos = venda.tempoTotalEstimadoSegundos
  if (segundos != null && segundos > 0) {
    const minutos = Math.round(segundos / 60)
    return minutos > 0 ? `${minutos} min` : null
  }

  return null
}

/** Forma de cobrança no card (antecipado vs na entrega/retirada). */
export function rotuloFormaCobrancaKanbanCard(
  tipoVenda: string | null | undefined,
  fluxo: FluxoPagamentoEntrega | null | undefined
): string | null {
  if (!fluxo) return null
  if (fluxo === 'ja_pago') return 'Já foi pago'

  const tipo = String(tipoVenda ?? '').trim().toLowerCase()
  if (tipo === 'retirada') return 'Cobrança na retirada'
  return 'Cobrar na entrega'
}

/** Nomes dos meios de pagamento das cobranças ativas (ex.: Dinheiro, PIX). */
export function formatarFormaPagamentoKanbanCard(
  cobrancas: CobrancaKanbanDeliveryResumo[] | undefined,
  nomesMeiosPagamento: Record<string, string>
): string | null {
  if (!cobrancas?.length) return null

  const nomes: string[] = []
  const idsVistos = new Set<string>()

  for (const cobranca of cobrancas) {
    if (cobranca.status === 'cancelada') continue
    const id = String(cobranca.meioPagamentoId ?? '').trim()
    if (!id || idsVistos.has(id)) continue
    idsVistos.add(id)
    const nome = nomesMeiosPagamento[id]?.trim()
    if (nome) nomes.push(nome)
  }

  return nomes.length > 0 ? nomes.join(', ') : null
}
