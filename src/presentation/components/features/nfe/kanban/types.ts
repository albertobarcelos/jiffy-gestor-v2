import type { ReactNode } from 'react'
import type { VendaUnificadaDTO } from '@/src/presentation/hooks/useVendasUnificadas'

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

export type CriterioOrdenacaoKanban = 'data' | 'numero' | 'cliente'
export type DirecaoOrdenacaoKanban = 'asc' | 'desc'

export type OrigemFiltro = '' | 'PDV' | 'GESTOR' | 'DELIVERY'

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
