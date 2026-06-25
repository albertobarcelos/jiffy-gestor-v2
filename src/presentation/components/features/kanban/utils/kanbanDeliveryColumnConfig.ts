import type { StatusDeliveryApi } from '@/src/application/dto/api/pedidoDeliveryApi'
import type { ColunaKanbanId } from '../types'
import type { PedidosDeliveryInfiniteParams } from '../hooks/usePedidosDeliveryInfinite'
import type { VendaUnificadaDTO } from '../hooks/useVendasUnificadas'

/** Colunas do Kanban delivery com query paginada independente. */
export const DELIVERY_KANBAN_COLUMN_IDS: ColunaKanbanId[] = [
  'NOVOS_PEDIDOS',
  'EM_PREPARO',
  'PRONTO_ENTREGA',
  'EM_ROTA',
  'FINALIZADAS',
  'COM_NFE',
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
    statusDelivery: 'FINALIZADO',
    cancelado: false,
    dataFinalizacaoInicio: temFiltroFinalizacao ? params.dataFinalizacaoInicio : undefined,
    dataFinalizacaoFim: temFiltroFinalizacao ? params.dataFinalizacaoFim : undefined,
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
  if (columnId === 'FINALIZADAS' || columnId === 'COM_NFE') {
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

/** Colunas que compartilham a mesma query API (`FINALIZADO`) e exigem split client-side. */
export function isColunaKanbanDeliveryFiscalSplit(columnId: ColunaKanbanId): boolean {
  return columnId === 'FINALIZADAS' || columnId === 'COM_NFE'
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
      return etapa === 'FINALIZADAS' || etapa === 'PENDENTE_EMISSAO'
    case 'COM_NFE':
      return etapa === 'COM_NFE'
    default:
      return false
  }
}

export function extrairColumnIdDePedidosDeliveryKanbanQueryKey(
  queryKey: readonly unknown[]
): ColunaKanbanId | null {
  if (queryKey.length < 6) return null
  const marker = queryKey[4]
  if (marker !== 'column') return null
  const columnId = queryKey[5]
  if (typeof columnId !== 'string') return null
  return columnId as ColunaKanbanId
}
