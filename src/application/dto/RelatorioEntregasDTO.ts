import { z } from 'zod'

/** Ordenação aceita por GET /api/v1/relatorios/entregadores/resumo-entregas */
export const OrderByFieldRelatorioEntregasSchema = z.enum([
  'nomeEntregador',
  'countEntregasParticipadas',
  'valorTotalEntregasParticipadas',
  'somaTaxasEntrega',
  'tempoMedioEntregaEmSegundos',
])

export type OrderByFieldRelatorioEntregas = z.infer<typeof OrderByFieldRelatorioEntregasSchema>

export const OrderByDirectionRelatorioEntregasSchema = z.enum(['asc', 'desc'])

export type OrderByDirectionRelatorioEntregas = z.infer<typeof OrderByDirectionRelatorioEntregasSchema>

export type EntregadorResumoEntregasDTO = {
  id: string
  nome: string | null
  telefone: string | null
}

export type RelatorioEntregasItemDTO = {
  entregador: EntregadorResumoEntregasDTO
  countEntregasParticipadas: number
  valorTotalEntregasParticipadas: number
  somaTaxasEntrega: number
  tempoMedioEntregaEmSegundos: number | null
}

export type RelatorioEntregasListagemResponseDTO = {
  count?: number
  page?: number
  limit?: number
  totalPages?: number
  hasNext?: boolean
  hasPrevious?: boolean
  items?: RelatorioEntregasItemDTO[]
}

export type RelatorioEntregasVendaDTO = {
  id: string
  codigoVenda: string
  numeroVenda: number | null
  valorFinal: number
  taxaEntrega: number | null
  dataFinalizacao: string | null
  statusDelivery: string | null
  nomeCliente: string | null
}

export type RelatorioEntregasDetalheDTO = RelatorioEntregasItemDTO & {
  vendas: {
    count?: number
    hasNext?: boolean
    hasPrevious?: boolean
    items: RelatorioEntregasVendaDTO[]
  }
}

export function numeroRelatorioEntregas(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  if (typeof raw === 'string') {
    const n = parseFloat(raw.replace(',', '.'))
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

export function mapEntregadorResumoEntregas(raw: unknown): EntregadorResumoEntregasDTO | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = String(o.id ?? '').trim()
  if (!id) return null
  return {
    id,
    nome: o.nome != null && String(o.nome).trim() ? String(o.nome).trim() : null,
    telefone: o.telefone != null && String(o.telefone).trim() ? String(o.telefone) : null,
  }
}

export function mapRelatorioEntregasItem(raw: unknown): RelatorioEntregasItemDTO | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const entregador = mapEntregadorResumoEntregas(o.entregador)
  if (!entregador) return null
  const tempoRaw = o.tempoMedioEntregaEmSegundos
  return {
    entregador,
    countEntregasParticipadas: numeroRelatorioEntregas(o.countEntregasParticipadas),
    valorTotalEntregasParticipadas: numeroRelatorioEntregas(o.valorTotalEntregasParticipadas),
    somaTaxasEntrega: numeroRelatorioEntregas(o.somaTaxasEntrega),
    tempoMedioEntregaEmSegundos:
      tempoRaw == null || tempoRaw === '' ? null : numeroRelatorioEntregas(tempoRaw),
  }
}

export function mapRelatorioEntregasListagem(data: Record<string, unknown>): RelatorioEntregasListagemResponseDTO {
  const itemsRaw = data.items
  const items = Array.isArray(itemsRaw)
    ? itemsRaw.map(mapRelatorioEntregasItem).filter((x): x is RelatorioEntregasItemDTO => x !== null)
    : []

  return {
    count: typeof data.count === 'number' ? data.count : undefined,
    page: typeof data.page === 'number' ? data.page : undefined,
    limit: typeof data.limit === 'number' ? data.limit : undefined,
    totalPages: typeof data.totalPages === 'number' ? data.totalPages : undefined,
    hasNext: typeof data.hasNext === 'boolean' ? data.hasNext : undefined,
    hasPrevious: typeof data.hasPrevious === 'boolean' ? data.hasPrevious : undefined,
    items,
  }
}

export function mapRelatorioEntregasVenda(raw: unknown): RelatorioEntregasVendaDTO | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = String(o.id ?? '').trim()
  if (!id) return null
  const dataFinalizacao =
    o.dataFinalizacao != null && String(o.dataFinalizacao).trim()
      ? String(o.dataFinalizacao)
      : null
  const status =
    o.statusDelivery ?? o.statusEtapaOperacional ?? o.status_delivery ?? null
  const taxaRaw = o.taxaEntrega ?? o.taxa_entrega
  const taxaValor =
    taxaRaw && typeof taxaRaw === 'object'
      ? (taxaRaw as Record<string, unknown>).valor
      : taxaRaw
  const clienteRaw = o.cliente
  const cliente =
    clienteRaw && typeof clienteRaw === 'object'
      ? (clienteRaw as Record<string, unknown>)
      : null
  const nomeCliente =
    cliente?.nome != null && String(cliente.nome).trim()
      ? String(cliente.nome).trim()
      : null
  return {
    id,
    codigoVenda: String(o.codigoVenda ?? o.codigo_venda ?? '').trim(),
    numeroVenda:
      typeof o.numeroVenda === 'number'
        ? o.numeroVenda
        : typeof o.numero_venda === 'number'
          ? o.numero_venda
          : null,
    valorFinal: numeroRelatorioEntregas(o.valorFinal ?? o.valor_final),
    taxaEntrega: taxaValor == null || taxaValor === '' ? null : numeroRelatorioEntregas(taxaValor),
    dataFinalizacao,
    statusDelivery: status != null && String(status).trim() ? String(status).trim() : null,
    nomeCliente,
  }
}

export function mapRelatorioEntregasDetalhe(data: Record<string, unknown>): RelatorioEntregasDetalheDTO | null {
  const resumo = mapRelatorioEntregasItem(data)
  if (!resumo) return null
  const vendasRaw = data.vendas
  const vendasObj =
    vendasRaw && typeof vendasRaw === 'object' ? (vendasRaw as Record<string, unknown>) : {}
  const itemsRaw = vendasObj.items
  const items = Array.isArray(itemsRaw)
    ? itemsRaw.map(mapRelatorioEntregasVenda).filter((x): x is RelatorioEntregasVendaDTO => x !== null)
    : []

  return {
    ...resumo,
    vendas: {
      count: typeof vendasObj.count === 'number' ? vendasObj.count : undefined,
      hasNext: typeof vendasObj.hasNext === 'boolean' ? vendasObj.hasNext : undefined,
      hasPrevious: typeof vendasObj.hasPrevious === 'boolean' ? vendasObj.hasPrevious : undefined,
      items,
    },
  }
}
