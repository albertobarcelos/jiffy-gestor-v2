import type {
  AtualizarCobrancasPedidoDeliveryApi,
  CobrancaPedidoDeliveryApi,
  MomentoCobrancaDeliveryApi,
} from '@/src/application/dto/api/pedidoDeliveryApi'
import type { FluxoPagamentoEntrega } from '@/src/domain/types/vendaDetalhe'
import { pagamentoEstaCancelado } from '@/src/domain/services/pedido/RegrasPagamentoPedido'
import type { PagamentoSelecionado } from '@/src/domain/types/pedido'

export type PagamentoCobrancaPatchItem = {
  meioPagamentoId: string
  valor: number
}

function cobrancaDeliveryCancelada(c: Record<string, unknown>): boolean {
  const status = String(c.status ?? '').trim().toLowerCase()
  if (status === 'cancelada') return true
  const dataCancelamento = c.dataCancelamento
  return dataCancelamento != null && String(dataCancelamento).trim() !== ''
}

function cobrancaDeliveryPaga(c: Record<string, unknown>): boolean {
  const status = String(c.status ?? '').trim().toLowerCase()
  if (status === 'paga') return true
  if (status === 'pendente' || status === 'cancelada') return false
  return c.pagamentoEfetivado != null && typeof c.pagamentoEfetivado === 'object'
}

export function extrairIdsCobrancasAtivasPedidoDelivery(
  pedido: Record<string, unknown>
): string[] {
  const cobrancas = Array.isArray(pedido.cobrancas) ? pedido.cobrancas : []
  return cobrancas
    .filter((raw): raw is Record<string, unknown> => raw != null && typeof raw === 'object')
    .filter(c => !cobrancaDeliveryCancelada(c))
    .filter(c => String(c.id ?? '').trim().length > 0)
    .map(c => String(c.id))
}

export function extrairIdsCobrancasPendentesPedidoDelivery(
  pedido: Record<string, unknown>
): string[] {
  const cobrancas = Array.isArray(pedido.cobrancas) ? pedido.cobrancas : []
  return cobrancas
    .filter((raw): raw is Record<string, unknown> => raw != null && typeof raw === 'object')
    .filter(c => !cobrancaDeliveryCancelada(c) && !cobrancaDeliveryPaga(c))
    .filter(c => String(c.id ?? '').trim().length > 0)
    .map(c => String(c.id))
}

export function cobrancasPatchTemOperacao(
  patch: AtualizarCobrancasPedidoDeliveryApi
): boolean {
  const cobrancas = patch.cobrancas
  if (!cobrancas) return false
  return Boolean(
    (cobrancas.add?.length ?? 0) > 0 ||
      (cobrancas.cancel?.length ?? 0) > 0 ||
      (cobrancas.confirm?.length ?? 0) > 0
  )
}

/**
 * Monta PATCH incremental: cancela só removidas, adiciona só novas (sem id), confirma pendentes ao quitar.
 */
export function buildAtualizarCobrancasPedidoDeliveryPatch(args: {
  cobrancaIdsAtivas: string[]
  cobrancaIdsPendentes: string[]
  pagamentos: PagamentoSelecionado[]
  fluxoPagamentoEntrega: FluxoPagamentoEntrega
}): AtualizarCobrancasPedidoDeliveryApi {
  const momentoCobranca: MomentoCobrancaDeliveryApi =
    args.fluxoPagamentoEntrega === 'cobrar_entregador' ? 'na_entrega' : 'antecipado'

  const ativos = args.pagamentos.filter(p => !pagamentoEstaCancelado(p))
  const idsAtivosNoFormulario = new Set(
    ativos
      .map(p => p.id?.trim())
      .filter((id): id is string => Boolean(id))
  )

  const cancel = args.cobrancaIdsAtivas
    .filter(cobrancaId => !idsAtivosNoFormulario.has(cobrancaId))
    .map(cobrancaId => ({ cobrancaId }))

  const add: CobrancaPedidoDeliveryApi[] = ativos
    .filter(p => !p.id?.trim())
    .map(p => {
      const item: CobrancaPedidoDeliveryApi = {
        meioPagamentoId: p.meioPagamentoId,
        valor: p.valor,
        momentoCobranca,
      }
      if (momentoCobranca === 'antecipado') {
        item.pagamentoEfetivado = { confirmar: true }
      }
      return item
    })

  const confirm =
    momentoCobranca === 'antecipado'
      ? ativos
          .filter(
            p =>
              p.id?.trim() &&
              idsAtivosNoFormulario.has(p.id!) &&
              args.cobrancaIdsPendentes.includes(p.id!)
          )
          .map(p => ({ cobrancaId: p.id! }))
      : []

  const cobrancas: AtualizarCobrancasPedidoDeliveryApi['cobrancas'] = {}
  if (cancel.length > 0) cobrancas.cancel = cancel
  if (add.length > 0) cobrancas.add = add
  if (confirm.length > 0) cobrancas.confirm = confirm

  return { cobrancas }
}

export function buildConfirmarCobrancasPendentesPedidoDeliveryPatch(
  cobrancaIdsPendentes: string[]
): AtualizarCobrancasPedidoDeliveryApi {
  return {
    cobrancas: {
      confirm: cobrancaIdsPendentes.map(cobrancaId => ({ cobrancaId })),
    },
  }
}

/** Cobranças ativas no formulário — ignora histórico cancelado para não re-adicionar no PATCH. */
export function pagamentosAtivosParaPatchDelivery(
  pagamentos: PagamentoSelecionado[]
): PagamentoCobrancaPatchItem[] {
  return pagamentos
    .filter(p => !pagamentoEstaCancelado(p))
    .map(p => ({
      meioPagamentoId: p.meioPagamentoId,
      valor: p.valor,
    }))
}
