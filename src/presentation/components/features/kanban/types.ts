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
}

export type Venda = VendaUnificadaDTO

export type ColunaKanbanId =
  | 'NOVOS_PEDIDOS'
  | 'EM_PREPARO'
  | 'PRONTO_ENTREGA'
  | 'EM_ROTA'
  | 'FINALIZADAS'
  | 'PENDENTE_EMISSAO'
  | 'COM_NFE'
  | 'REJEITADAS'

export type CriterioOrdenacaoKanban = 'data' | 'numero'
export type DirecaoOrdenacaoKanban = 'asc' | 'desc'

export type OrigemFiltro = '' | 'PDV' | 'GESTOR' | 'DELIVERY'

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
