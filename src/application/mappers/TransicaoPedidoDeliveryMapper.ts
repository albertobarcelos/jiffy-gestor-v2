import { extrairStatusFinanceiroPedidoDelivery } from '@/src/application/mappers/PedidoDeliveryDetalheAdapter'
import {
  mapPedidoDeliverySummaryParaVendaUnificadaDTO,
  normalizarPedidoDeliverySummaryJson,
} from '@/src/application/mappers/PedidoDeliveryListMapper'
import type { StatusDeliveryApi } from '@/src/application/dto/api/pedidoDeliveryApi'
import type {
  AcaoTransicaoKanbanEntrega,
  KanbanVendaCachePatch,
} from '@/src/application/dto/TransicaoKanbanDTO'
import type { VendaUnificadaDTO } from '@/features/kanban/hooks/useVendasUnificadas'

function extrairObservacoesPatchDeRegistro(registro: Record<string, unknown>): string[] | undefined {
  const raw = registro.observacoes ?? registro.observacao
  if (raw == null) return undefined

  if (Array.isArray(raw)) {
    const textos = raw
      .map(entry => {
        if (typeof entry === 'string') return entry.trim()
        if (entry && typeof entry === 'object' && 'observacao' in entry) {
          return String((entry as { observacao?: string }).observacao ?? '').trim()
        }
        return ''
      })
      .filter(Boolean)
    return textos.length > 0 ? textos : undefined
  }

  if (typeof raw === 'string') {
    const t = raw.trim()
    return t ? [t] : undefined
  }

  return undefined
}

function isoDeCampoApi(valor: unknown): string | null {
  if (valor == null) return null
  const texto = String(valor).trim()
  return texto || null
}

function objetoRaizDeliverySummary(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const registro = raw as Record<string, unknown>
  if (registro.data != null && typeof registro.data === 'object' && !Array.isArray(registro.data)) {
    return registro.data as Record<string, unknown>
  }
  return registro
}

function campoPresenteNoSummary(o: Record<string, unknown>, campo: string): boolean {
  return Object.prototype.hasOwnProperty.call(o, campo) && o[campo] != null
}

/**
 * Summary de listagem de verdade (cliente/valor/tipo no JSON). Payload fino de
 * STATUS_ALTERADO só com id+status — ou com tipo/valor defaultados — passa no mapper
 * com defaults (R$ 0, entrega, sem cliente, já pago) e não pode substituir o card.
 */
export function pedidoDeliverySummaryTemCamposComerciais(raw: unknown): boolean {
  const o = objetoRaizDeliverySummary(raw)
  if (!o) return false
  const tipo = String(o.tipoEntrega ?? '')
    .trim()
    .toLowerCase()
  const temTipo =
    campoPresenteNoSummary(o, 'tipoEntrega') && (tipo === 'entrega' || tipo === 'retirada')
  const valor = Number(o.valorFinal)
  const temValor = campoPresenteNoSummary(o, 'valorFinal') && Number.isFinite(valor)
  const cliente =
    o.cliente && typeof o.cliente === 'object' && !Array.isArray(o.cliente)
      ? (o.cliente as Record<string, unknown>)
      : null
  const temClienteNome = Boolean(cliente && String(cliente.nome ?? '').trim())
  return temTipo && temValor && temClienteNome
}

/** Só etapa/datas/entregador — não pisa valor, cliente nem pagamento com default do mapper. */
export function extrairPatchOperacionalKanbanDeStatusDelivery(raw: unknown): KanbanVendaCachePatch {
  const o = objetoRaizDeliverySummary(raw) ?? {}
  const status = isoDeCampoApi(o.statusDelivery) ?? isoDeCampoApi(o.statusEtapaOperacional)
  const patch: KanbanVendaCachePatch = {
    statusEtapaOperacional: status,
    dataUltimaModificacao: isoDeCampoApi(o.dataUltimaModificacao),
    dataFinalizacao: inferirDataFinalizacaoPatch(status, isoDeCampoApi(o.dataFinalizacao)),
  }

  if (!Object.prototype.hasOwnProperty.call(o, 'entregador')) return patch

  const entregadorRaw = o.entregador
  if (entregadorRaw == null) {
    patch.entregador = null
    return patch
  }
  if (typeof entregadorRaw === 'object' && !Array.isArray(entregadorRaw)) {
    const r = entregadorRaw as Record<string, unknown>
    const id = String(r.id ?? '').trim()
    if (id) {
      patch.entregador = {
        id,
        nome: r.nome != null ? String(r.nome) : null,
        telefone: r.telefone != null ? String(r.telefone) : null,
      }
    }
  }
  return patch
}

/** Mapeia ação operacional do Kanban gestor → `toStatus` do módulo delivery. */
export function mapAcaoTransicaoGestorToStatusDelivery(
  acao: AcaoTransicaoKanbanEntrega
): StatusDeliveryApi {
  switch (acao) {
    case 'iniciar_preparo':
      return 'EM_PREPARO'
    case 'marcar_pronto':
      return 'PRONTO'
    case 'despachar':
      return 'EM_ROTA'
    case 'finalizar':
      return 'FINALIZADO'
    case 'cancelar':
      return 'CANCELADO'
    default:
      return 'PENDENTE'
  }
}

export function mapAcoesTransicaoGestorToStatusDelivery(
  acoes: AcaoTransicaoKanbanEntrega[]
): StatusDeliveryApi[] {
  return acoes.map(mapAcaoTransicaoGestorToStatusDelivery)
}

function inferirDataFinalizacaoPatch(
  status: string | null | undefined,
  dataFinalizacao: string | null | undefined
): string | null {
  if (dataFinalizacao) return dataFinalizacao
  const s = String(status ?? '').trim().toUpperCase()
  if (
    s === 'FINALIZADO' ||
    s === 'FINALIZADA' ||
    s === 'ENTREGUE' ||
    s === 'CONCLUIDO'
  ) {
    return new Date().toISOString()
  }
  return null
}

/** Extrai patch de cache do Kanban a partir da resposta PATCH delivery/transicao-status ou GET pedido. */
export function extrairPatchKanbanDeTransicaoDelivery(data: unknown): KanbanVendaCachePatch {
  const card = extrairVendaUnificadaDeRespostaDeliverySummary(data)
  if (card) {
    const statusEtapaOperacional = card.statusEtapaOperacional ?? null
    return {
      statusEtapaOperacional,
      dataUltimaModificacao: card.dataUltimaModificacao ?? null,
      dataFinalizacao: inferirDataFinalizacaoPatch(statusEtapaOperacional, card.dataFinalizacao),
      statusFinanceiro: card.statusFinanceiro ?? null,
      valorFinal: card.valorFinal,
      observacoes: card.observacoes ?? null,
    }
  }

  const registro =
    data && typeof data === 'object' ? (data as Record<string, unknown>) : {}

  const inner =
    registro.data != null && typeof registro.data === 'object' && !Array.isArray(registro.data)
      ? (registro.data as Record<string, unknown>)
      : registro

  const statusEtapaOperacional =
    isoDeCampoApi(inner.statusDelivery) ?? isoDeCampoApi(registro.statusDelivery)

  const valorFinalRaw = inner.valorFinal ?? registro.valorFinal
  const valorFinalNum = Number(valorFinalRaw)
  const valorFinal = Number.isFinite(valorFinalNum) ? valorFinalNum : undefined

  const observacoes =
    extrairObservacoesPatchDeRegistro(inner) ?? extrairObservacoesPatchDeRegistro(registro)

  return {
    statusEtapaOperacional,
    dataUltimaModificacao:
      isoDeCampoApi(inner.dataUltimaModificacao) ??
      isoDeCampoApi(registro.dataUltimaModificacao),
    dataFinalizacao: inferirDataFinalizacaoPatch(
      statusEtapaOperacional,
      isoDeCampoApi(inner.dataFinalizacao) ?? isoDeCampoApi(registro.dataFinalizacao)
    ),
    statusFinanceiro: extrairStatusFinanceiroPedidoDelivery(data),
    valorFinal,
    observacoes,
  }
}

/** Converte resposta summary (listagem ou transicao-status) em card do Kanban. */
export function extrairVendaUnificadaDeRespostaDeliverySummary(
  data: unknown
): VendaUnificadaDTO | null {
  if (!data || typeof data !== 'object') return null
  const registro = data as Record<string, unknown>
  const inner =
    registro.data != null && typeof registro.data === 'object' && !Array.isArray(registro.data)
      ? (registro.data as Record<string, unknown>)
      : registro

  const summary = normalizarPedidoDeliverySummaryJson(inner)
  if (!summary) return null
  return mapPedidoDeliverySummaryParaVendaUnificadaDTO(summary)
}

/** Unifica resposta gestor (legado) e delivery no patch do Kanban. */
export function extrairPatchKanbanDeRespostaTransicao(data: unknown): KanbanVendaCachePatch {
  const delivery = extrairPatchKanbanDeTransicaoDelivery(data)
  const registro =
    data && typeof data === 'object' ? (data as Record<string, unknown>) : {}

  const statusGestor =
    isoDeCampoApi(registro.statusOperacional) ??
    isoDeCampoApi(registro.status_operacional) ??
    isoDeCampoApi(registro.statusEtapaOperacional) ??
    isoDeCampoApi(registro.status_etapa_operacional)

  return {
    statusEtapaOperacional: delivery.statusEtapaOperacional ?? statusGestor,
    dataUltimaModificacao:
      delivery.dataUltimaModificacao ??
      isoDeCampoApi(registro.dataUltimaModificacao) ??
      isoDeCampoApi(registro.data_ultima_modificacao),
    dataFinalizacao:
      delivery.dataFinalizacao ??
      isoDeCampoApi(registro.dataFinalizacao) ??
      isoDeCampoApi(registro.data_finalizacao),
    statusFinanceiro: delivery.statusFinanceiro,
    observacoes: delivery.observacoes,
  }
}
