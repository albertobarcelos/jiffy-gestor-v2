import type { StatusDeliveryApi } from '@/src/application/dto/api/pedidoDeliveryApi'
import { isPedidoEntregaKanban } from '@/src/shared/helpers/pedidoEntregaKanban'
import type { ColunaKanbanId, FiltroStatusEntreguesKanban } from '../types'
import type { PedidosDeliveryInfiniteParams } from '../hooks/usePedidosDeliveryInfinite'
import type { VendaUnificadaDTO } from '../hooks/useVendasUnificadas'

/** Colunas do Kanban delivery com query paginada independente. */
export const DELIVERY_KANBAN_COLUMN_IDS: ColunaKanbanId[] = [
  'NOVOS_PEDIDOS',
  'EM_PREPARO',
  'PRONTO_ENTREGA',
  'EM_ROTA',
  'FINALIZADAS',
]

export interface PedidosDeliveryKanbanColumnFilterOptions {
  /** Envia `dataCriacaoInicial/Final` na API (colunas operacionais). */
  enviarFiltroCriacaoNaApi?: boolean
  /** Envia `dataFinalizacaoInicial/Final` na API (colunas fiscais). */
  enviarFiltroFinalizacaoNaApi?: boolean
}

/** Colunas operacionais — sem datas de finalização; criação conforme período ativo na consulta. */
export function paramsOperacionaisDeliveryKanbanColumn(
  params: PedidosDeliveryInfiniteParams,
  options?: Pick<PedidosDeliveryKanbanColumnFilterOptions, 'enviarFiltroCriacaoNaApi'>
): PedidosDeliveryInfiniteParams {
  const {
    dataFinalizacaoInicio: _fi,
    dataFinalizacaoFim: _ff,
    dataUltimaModificacaoInicial: _du,
    ...rest
  } = params

  const result: PedidosDeliveryInfiniteParams = { ...rest }

  if (!options?.enviarFiltroCriacaoNaApi) {
    delete result.dataCriacaoInicial
    delete result.dataCriacaoFinal
  }

  return result
}

/** @deprecated Use `paramsOperacionaisDeliveryKanbanColumn` */
export function paramsApiOperacionaisDeliveryKanban(
  params: PedidosDeliveryInfiniteParams
): PedidosDeliveryInfiniteParams {
  return paramsOperacionaisDeliveryKanbanColumn(params)
}

function paramsFinalizadosKanbanColumn(
  params: PedidosDeliveryInfiniteParams,
  options?: Pick<PedidosDeliveryKanbanColumnFilterOptions, 'enviarFiltroFinalizacaoNaApi'>
): PedidosDeliveryInfiniteParams {
  const base = paramsOperacionaisDeliveryKanbanColumn(params, {
    enviarFiltroCriacaoNaApi: false,
  })
  const temFiltroFinalizacao =
    options?.enviarFiltroFinalizacaoNaApi &&
    Boolean(params.dataFinalizacaoInicio || params.dataFinalizacaoFim)

  return {
    ...base,
    statusDelivery: ['FINALIZADO', 'CANCELADO'],
    cancelado: null,
    dataFinalizacaoInicio: undefined,
    dataFinalizacaoFim: undefined,
    dataUltimaModificacaoInicial: temFiltroFinalizacao
      ? params.dataFinalizacaoInicio
      : undefined,
  }
}

const STATUS_POR_COLUNA_OPERACIONAL: Partial<Record<ColunaKanbanId, StatusDeliveryApi>> = {
  NOVOS_PEDIDOS: 'PENDENTE',
  EM_PREPARO: 'EM_PREPARO',
  PRONTO_ENTREGA: 'PRONTO',
  EM_ROTA: 'EM_ROTA',
}

/** Monta filtros da API para cada coluna do Kanban delivery. */
export function buildPedidosDeliveryParamsForKanbanColumn(
  columnId: ColunaKanbanId,
  params: PedidosDeliveryInfiniteParams,
  options?: PedidosDeliveryKanbanColumnFilterOptions
): PedidosDeliveryInfiniteParams {
  if (columnId === 'FINALIZADAS' || columnId === 'COM_FISCAL') {
    return paramsFinalizadosKanbanColumn(params, options)
  }

  const status = STATUS_POR_COLUNA_OPERACIONAL[columnId]
  if (!status) {
    return { ...paramsOperacionaisDeliveryKanbanColumn(params, options), cancelado: false }
  }

  return {
    ...paramsOperacionaisDeliveryKanbanColumn(params, options),
    statusDelivery: status,
    cancelado: false,
  }
}

/** Coluna visual Entregues: pool FINALIZADO+CANCELADO filtrado no client por status. */
export function isColunaKanbanDeliveryFiscalSplit(columnId: ColunaKanbanId): boolean {
  return columnId === 'FINALIZADAS'
}

/** Filtra itens da listagem para a coluna visual (etapa Kanban + regras delivery). */
export function vendaPertenceColunaDeliveryKanban(
  venda: VendaUnificadaDTO,
  columnId: ColunaKanbanId,
  getEtapaKanban: (v: VendaUnificadaDTO) => string
): boolean {
  const etapa = getEtapaKanban(venda)

  switch (columnId) {
    case 'NOVOS_PEDIDOS':
      return etapa === 'NOVOS_PEDIDOS'
    case 'EM_PREPARO':
      return etapa === 'EM_PREPARO'
    case 'PRONTO_ENTREGA':
      return etapa === 'PRONTO_ENTREGA'
    case 'EM_ROTA':
      return etapa === 'EM_ROTA'
    case 'FINALIZADAS':
      if (
        pedidoDeliveryCancelado(venda) &&
        isPedidoEntregaKanban(
          venda.tabelaOrigem,
          venda.tipoVenda,
          venda.statusEtapaOperacional
        )
      ) {
        return true
      }
      return (
        etapa === 'FINALIZADAS' ||
        etapa === 'COM_FISCAL' ||
        etapa === 'REJEITADAS' ||
        etapa === 'PENDENTE_EMISSAO'
      )
    default:
      return false
  }
}

const STATUS_ENTREGUES_EMITIDA = new Set([
  'EMITIDA',
  'AUTORIZADA',
  'AUTORIZADO',
])
const STATUS_ENTREGUES_CANCELADA = new Set(['CANCELADA', 'INUTILIZADA'])
const STATUS_ENTREGUES_REJEITADA = new Set(['REJEITADA', 'DENEGADA'])
const STATUS_ENTREGUES_PENDENTE = new Set([
  'PENDENTE',
  'PENDENTE_EMISSAO',
  'PENDENTE_AUTORIZACAO',
  'EMITINDO',
  'CONTINGENCIA',
])

function statusFiscalEntregues(venda: VendaUnificadaDTO): string {
  return String(venda.statusFiscal ?? '')
    .trim()
    .toUpperCase()
}

function pedidoDeliveryCancelado(venda: VendaUnificadaDTO): boolean {
  if (String(venda.dataCancelamento ?? '').trim()) return true
  const op = String(venda.statusEtapaOperacional ?? '')
    .trim()
    .toUpperCase()
  return op === 'CANCELADO' || op === 'CANCELADA'
}

function vendaEntreguesTemNotaEmitida(venda: VendaUnificadaDTO): boolean {
  const sf = statusFiscalEntregues(venda)
  if (STATUS_ENTREGUES_EMITIDA.has(sf)) return true
  if (
    STATUS_ENTREGUES_REJEITADA.has(sf) ||
    STATUS_ENTREGUES_PENDENTE.has(sf) ||
    STATUS_ENTREGUES_CANCELADA.has(sf)
  ) {
    return false
  }
  if (String(venda.dataEmissaoFiscal ?? '').trim()) return true
  if (typeof venda.temNFeEmitida === 'function' && venda.temNFeEmitida()) return true
  return false
}

export function bucketStatusEntreguesKanban(
  venda: VendaUnificadaDTO,
  getEtapaKanban: (v: VendaUnificadaDTO) => string
): Exclude<FiltroStatusEntreguesKanban, 'TODAS'> | null {
  const sf = statusFiscalEntregues(venda)
  if (STATUS_ENTREGUES_CANCELADA.has(sf) || pedidoDeliveryCancelado(venda)) return 'CANCELADA'
  if (vendaEntreguesTemNotaEmitida(venda)) return 'EMITIDA'
  if (STATUS_ENTREGUES_REJEITADA.has(sf)) return 'REJEITADA'

  const etapa = getEtapaKanban(venda)
  if (etapa === 'REJEITADAS') return 'REJEITADA'
  if (etapa === 'PENDENTE_EMISSAO' || STATUS_ENTREGUES_PENDENTE.has(sf)) return 'PENDENTE'
  if (etapa === 'COM_FISCAL') return 'PENDENTE'
  if (etapa === 'FINALIZADAS') return 'FINALIZADA'
  return null
}

export function vendaAtendeFiltroStatusEntregues(
  venda: VendaUnificadaDTO,
  filtro: FiltroStatusEntreguesKanban,
  getEtapaKanban: (v: VendaUnificadaDTO) => string
): boolean {
  if (filtro === 'TODAS') return true
  return bucketStatusEntreguesKanban(venda, getEtapaKanban) === filtro
}

export const FILTRO_STATUS_ENTREGUES_PADRAO: FiltroStatusEntreguesKanban = 'TODAS'

export const OPCOES_FILTRO_STATUS_ENTREGUES: {
  value: FiltroStatusEntreguesKanban
  label: string
}[] = [
  { value: 'TODAS', label: 'Todas' },
  { value: 'FINALIZADA', label: 'Finalizada' },
  { value: 'EMITIDA', label: 'Emitida' },
  { value: 'PENDENTE', label: 'Pendente' },
  { value: 'REJEITADA', label: 'Rejeitada' },
  { value: 'CANCELADA', label: 'Cancelada' },
]

/**
 * Extrai o id da coluna de keys no padrão:
 * `['tenant', empresaId, 'delivery', 'pedidos', 'infinite', 'column', columnId, params]`
 */
export function extrairColumnIdDePedidosDeliveryKanbanQueryKey(
  queryKey: readonly unknown[]
): ColunaKanbanId | null {
  if (queryKey.length < 7) return null
  if (queryKey[0] !== 'tenant') return null
  if (queryKey[2] !== 'delivery' || queryKey[3] !== 'pedidos' || queryKey[4] !== 'infinite') {
    return null
  }
  if (queryKey[5] !== 'column') return null
  const columnId = queryKey[6]
  if (typeof columnId !== 'string') return null
  return columnId as ColunaKanbanId
}
