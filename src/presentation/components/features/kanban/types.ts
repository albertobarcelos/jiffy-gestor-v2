import type { ReactNode } from 'react'
import type { VendaUnificadaDTO } from './hooks/useVendasUnificadas'

export type Priority = 'high' | 'medium' | 'low'

export interface KanbanColumn {
  id: string
  title: string
  color: string
  borderColor: string
  icon: ReactNode
  placeholder: string
  /** Cor do título no cabeçalho (padrão cinza). */
  tituloClasse?: string
}

export type Venda = VendaUnificadaDTO

export type ColunaKanbanId =
  | 'NOVOS_PEDIDOS'
  | 'EM_PREPARO'
  | 'PRONTO_ENTREGA'
  | 'EM_ROTA'
  | 'FINALIZADAS'
  | 'PENDENTE_EMISSAO'
  | 'COM_FISCAL'
  | 'REJEITADAS'

export type CriterioOrdenacaoKanban = 'data' | 'numero'
export type DirecaoOrdenacaoKanban = 'asc' | 'desc'

/** Filtro do cabeçalho da coluna Entregues no Kanban delivery. */
export type FiltroStatusEntreguesKanban =
  | 'TODAS'
  | 'FINALIZADA'
  | 'EMITIDA'
  | 'PENDENTE'
  | 'REJEITADA'
  | 'CANCELADA'

/**
 * Origem real da venda (contrato GET /vendas/unificado).
 * Não existe origem `DELIVERY` — delivery é `TipoCanalFiltro`.
 */
export type OrigemFiltro = '' | 'PDV' | 'GESTOR' | 'JIFFY_DELIVERY' | 'AIQFOME'

/**
 * Tipo/canal de negócio unificado (`tipo` na API).
 * - PDV → vendas do PDV
 * - GESTOR → só balcão (não delivery)
 * - DELIVERY → qualquer delivery (qualquer origem)
 */
export type TipoCanalFiltro = '' | 'PDV' | 'GESTOR' | 'DELIVERY'

/** Filtro de tipo de entrega no modo delivery (`''` = todos). */
export type TipoEntregaFiltro = '' | 'entrega' | 'retirada'

/**
 * Filtro do Kanban balcão.
 * - `''` / Emitidas: Finalizadas + Com NF
 * - `PENDENTE_EMISSAO`: inclui Pendentes no meio
 * - `REJEITADAS`: inclui Rejeitadas no meio
 * - `TODAS`: todas as colunas (Rejeitadas por último)
 */
export type ColunaKanbanFiltroExtra = '' | 'PENDENTE_EMISSAO' | 'REJEITADAS' | 'TODAS'

export type PeriodoOpcao =
  | 'Todos'
  | 'Hoje'
  | 'Ontem'
  | 'Últimos 7 Dias'
  | 'Mês Atual'
  | 'Mês Passado'
  | 'Últimos 30 Dias'
  | 'Últimos 60 Dias'
  | 'Últimos 90 Dias'
  | 'Datas Personalizadas'
