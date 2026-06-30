import {
  MdReceipt,
  MdSchedule,
  MdCheckCircle,
  MdPostAdd,
  MdRestaurant,
  MdLocalShipping,
  MdRoute,
} from 'react-icons/md'
import { COLUNAS_ENTREGA_OPERACIONAIS } from '../rules/vendasKanban.rules'
import type { KanbanColumn } from '../types'
import type { ModoKanbanVendas } from '../KanbanModoVendasToggle'

export function getKanbanColumnsConfig(): KanbanColumn[] {
  return [
    {
      id: 'NOVOS_PEDIDOS',
      title: 'Novos Pedidos',
      color: 'bg-sky-50',
      borderColor: 'border-sky-300',
      icon: <MdPostAdd className="h-4 w-4 text-sky-700" />,
      placeholder: 'Pedidos recém-criados aguardando triagem',
    },
    {
      id: 'EM_PREPARO',
      title: 'Em Preparo',
      color: 'bg-amber-50',
      borderColor: 'border-amber-300',
      icon: <MdRestaurant className="h-4 w-4 text-amber-700" />,
      placeholder: 'Pedidos em preparação na cozinha ou separação',
    },
    {
      id: 'PRONTO_ENTREGA',
      title: 'Pronto para entrega',
      color: 'bg-teal-50',
      borderColor: 'border-teal-300',
      icon: <MdLocalShipping className="h-4 w-4 text-teal-700" />,
      placeholder: 'Pedidos prontos para retirada ou envio',
    },
    {
      id: 'EM_ROTA',
      title: 'Em Rota / Retirada',
      color: 'bg-indigo-50',
      borderColor: 'border-indigo-300',
      icon: <MdRoute className="h-4 w-4 text-indigo-700" />,
      placeholder: 'Pedidos a caminho do cliente ou prontos para retirada',
    },
    {
      id: 'FINALIZADAS',
      title: 'Finalizadas',
      color: 'bg-primary/15',
      borderColor: 'border-gray-400',
      icon: <MdReceipt className="h-4 w-4 text-gray-600" />,
      placeholder: 'Vendas finalizadas aguardando ação',
    },
    {
      id: 'PENDENTE_EMISSAO',
      title: 'Pendente Emissão Fiscal',
      color: 'bg-yellow-50',
      borderColor: 'border-yellow-400',
      icon: <MdSchedule className="h-4 w-4 text-yellow-600" />,
      placeholder: 'Vendas aguardando emissão de NFe',
    },
    {
      id: 'COM_NFE',
      title: 'Com Nota Solicitada',
      color: 'bg-green-50',
      borderColor: 'border-green-400',
      icon: <MdCheckCircle className="h-4 w-4 text-green-600" />,
      placeholder: 'Vendas com nota fiscal solicitada',
    },
  ]
}

export function getVisibleKanbanColumns(modoKanbanVendas: ModoKanbanVendas): KanbanColumn[] {
  const todasColunasKanban = getKanbanColumnsConfig()
  return modoKanbanVendas === 'delivery'
    ? todasColunasKanban.filter(c => c.id !== 'PENDENTE_EMISSAO')
    : todasColunasKanban.filter(
        c => !COLUNAS_ENTREGA_OPERACIONAIS.includes(c.id as (typeof COLUNAS_ENTREGA_OPERACIONAIS)[number])
      )
}
