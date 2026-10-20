import {
  MdReceipt,
  MdSchedule,
  MdCheckCircle,
  MdPostAdd,
  MdRestaurant,
  MdLocalShipping,
  MdRoute,
  MdError,
} from 'react-icons/md'
import type { ColunaKanbanFiltroExtra, KanbanColumn } from '../types'
import type { ModoKanbanVendas } from '../KanbanModoVendasToggle'
import { balcaoKanbanColunasAtivas } from './kanbanBalcaoColumnConfig'

export function getKanbanColumnsConfig(): KanbanColumn[] {
  return [
    {
      id: 'NOVOS_PEDIDOS',
      title: 'Novos Pedidos',
      color: 'bg-slate-200',
      borderColor: 'border-slate-400',
      icon: <MdPostAdd className="h-4 w-4 text-slate-700" />,
      placeholder: 'Pedidos recém-criados aguardando triagem',
    },
    {
      id: 'EM_PREPARO',
      title: 'Em Preparo',
      color: 'bg-amber-100',
      borderColor: 'border-amber-300',
      icon: <MdRestaurant className="h-4 w-4 text-amber-700" />,
      placeholder: 'Pedidos em preparação na cozinha ou separação',
    },
    {
      id: 'PRONTO_ENTREGA',
      title: 'Pronto para entrega',
      color: 'bg-sky-100',
      borderColor: 'border-sky-300',
      icon: <MdLocalShipping className="h-4 w-4 text-sky-700" />,
      placeholder: 'Pedidos prontos para retirada ou envio',
    },
    {
      id: 'EM_ROTA',
      title: 'Em Rota / Retirada',
      color: 'bg-indigo-100',
      borderColor: 'border-indigo-300',
      icon: <MdRoute className="h-4 w-4 text-indigo-700" />,
      placeholder: 'Pedidos a caminho do cliente ou prontos para retirada',
    },
    {
      id: 'FINALIZADAS',
      title: 'Finalizadas',
      color: 'bg-primary/22',
      borderColor: 'border-primary/35',
      icon: <MdReceipt className="h-4 w-4 text-primary" />,
      placeholder: 'Vendas finalizadas aguardando ação',
    },
    {
      id: 'PENDENTE_EMISSAO',
      title: 'Pendente de Emissão',
      color: 'bg-yellow-100',
      borderColor: 'border-yellow-400',
      icon: <MdSchedule className="h-4 w-4 text-yellow-700" />,
      placeholder: 'Vendas aguardando emissão de NFe',
    },
    {
      id: 'COM_FISCAL',
      title: 'Com NF Solicitada',
      color: 'bg-green-100',
      borderColor: 'border-green-400',
      icon: <MdCheckCircle className="h-4 w-4 text-green-700" />,
      placeholder: 'Vendas com nota emitida, pendente ou rejeitada',
    },
    {
      id: 'REJEITADAS',
      title: 'Rejeitadas',
      color: 'bg-red-100',
      borderColor: 'border-red-400',
      icon: <MdError className="h-4 w-4 text-red-700" />,
      placeholder: 'Vendas com nota rejeitada ou denegada',
    },
  ]
}

export function getVisibleKanbanColumns(
  modoKanbanVendas: ModoKanbanVendas,
  filtroExtraBalcao?: ColunaKanbanFiltroExtra | null
): KanbanColumn[] {
  const todasColunasKanban = getKanbanColumnsConfig()

  if (modoKanbanVendas === 'delivery') {
    return todasColunasKanban
      .filter(
        c =>
          c.id !== 'PENDENTE_EMISSAO' &&
          c.id !== 'REJEITADAS' &&
          c.id !== 'COM_FISCAL'
      )
      .map(coluna =>
        coluna.id === 'FINALIZADAS'
          ? {
              ...coluna,
              title: 'Entregues',
              placeholder: 'Pedidos entregues, com ou sem nota fiscal',
              color: 'bg-[#d6f2ea]',
              borderColor: 'border-[#7ec9a8]',
              icon: <MdReceipt className="h-4 w-4 text-accent5" />,
            }
          : coluna
      )
  }

  const idsAtivos = balcaoKanbanColunasAtivas(filtroExtraBalcao)
  // Ordem explícita de balcaoKanbanColunasAtivas (Finalizadas → filtro → Com NF).
  const porId = new Map(todasColunasKanban.map(c => [c.id, c]))
  return idsAtivos.map(id => porId.get(id)).filter((c): c is KanbanColumn => Boolean(c))
}
