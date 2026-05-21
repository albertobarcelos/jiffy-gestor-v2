import { ReactNode, useMemo } from 'react'
import { MdReceiptLong, MdRestaurantMenu, MdAdd } from 'react-icons/md'
import { TbReceiptFilled } from 'react-icons/tb'
import { IoReceipt } from 'react-icons/io5'
import { X } from 'lucide-react'
import { DashboardResumoResponse } from '@/src/presentation/hooks/useDashboardResumoQuery'
import {
  formatarContagemPedidos,
  formatarMoeda,
  formatarItensPorPedido,
  rotuloPeriodoTituloCard,
  rotuloRodapeComparacaoCards,
} from './dashboardTextHelpers'

function MetricCard({
  tituloBase,
  tituloPeriodo,
  icon,
  valor,
  badge,
  rodape,
  badgePositivo,
}: {
  tituloBase: string
  /** Ex.: "7 dias"; null = só o título base */
  tituloPeriodo: string | null
  icon: ReactNode
  valor: string
  badge: string
  rodape: string
  badgePositivo: boolean
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-2">
      <div className="flex items-center gap-4">
        {/* Ícone à esquerda — círculo lavanda (modelo Figma) */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-100/90 text-primary md:h-14 md:w-14">
          {icon}
        </div>
        {/* Título, valor + badge e rodapé à direita */}
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold text-primary-text">
            {tituloBase}
            {tituloPeriodo ? (
              <span className="text-sm font-normal text-primary-text/90"> ({tituloPeriodo})</span>
            ) : null}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-2xl font-semibold tracking-tight text-primary-text md:text-[32px]">
              {valor}
            </span>
            <span
              className={`mr-4 rounded-md px-2 py-0.5 text-sm font-medium text-white ${
                badgePositivo ? 'bg-[#00B074]' : 'bg-[#D92D20]'
              }`}
            >
              {badge}
            </span>
          </div>
          <p className="mt-1 text-xs leading-snug text-[#006699] md:text-sm">{rodape}</p>
        </div>
      </div>
    </div>
  )
}

export function DashboardMetricas({
  periodoData,
  dadosResumo,
  carregandoResumo,
  erroResumo,
}: {
  periodoData: string
  dadosResumo: DashboardResumoResponse | undefined
  carregandoResumo: boolean
  erroResumo: boolean
}) {
  const rotuloRodapeCards = rotuloRodapeComparacaoCards(periodoData)

  const cardPedidosHojeProps = useMemo(() => {
    const carregando = carregandoResumo && dadosResumo == null
    if (erroResumo) {
      return {
        valor: '—',
        badge: '—',
        rodape: 'Erro ao carregar vendas',
        badgePositivo: false,
      }
    }
    if (carregando) {
      return {
        valor: '…',
        badge: '…',
        rodape: `${rotuloRodapeCards}: …`,
        badgePositivo: true,
      }
    }
    const atual = dadosResumo?.atual?.total?.countVendasEfetivadas ?? 0
    const anterior = dadosResumo?.anterior?.total?.countVendasEfetivadas ?? 0
    const comparacao = dadosResumo?.comparacao?.countVendasEfetivadas
    
    return {
      valor: formatarContagemPedidos(atual),
      badge: comparacao?.status === 'sem_base' ? 'Novo' : `${(comparacao?.percentual ?? 0) > 0 ? '+' : ''}${comparacao?.percentual ?? 0}%`,
      rodape: `${rotuloRodapeCards}: ${formatarContagemPedidos(anterior)}`,
      badgePositivo: comparacao?.status === 'positivo' || comparacao?.status === 'neutro' || comparacao?.status === 'sem_base',
    }
  }, [rotuloRodapeCards, carregandoResumo, dadosResumo, erroResumo])

  const cardTicketMedioProps = useMemo(() => {
    const carregando = carregandoResumo && dadosResumo == null
    if (erroResumo) {
      return {
        valor: '—',
        badge: '—',
        rodape: 'Erro ao carregar ticket médio',
        badgePositivo: false,
      }
    }
    if (carregando) {
      return {
        valor: '…',
        badge: '…',
        rodape: `${rotuloRodapeCards}: …`,
        badgePositivo: true,
      }
    }
    const ticketAtual = dadosResumo?.atual?.ticketMedio ?? 0
    const ticketAnterior = dadosResumo?.anterior?.ticketMedio ?? 0
    const comparacao = dadosResumo?.comparacao?.ticketMedio
    
    return {
      valor: formatarMoeda(ticketAtual),
      badge: comparacao?.status === 'sem_base' ? 'Novo' : `${(comparacao?.percentual ?? 0) > 0 ? '+' : ''}${comparacao?.percentual ?? 0}%`,
      rodape: `${rotuloRodapeCards}: ${formatarMoeda(ticketAnterior)}`,
      badgePositivo: comparacao?.status === 'positivo' || comparacao?.status === 'neutro' || comparacao?.status === 'sem_base',
    }
  }, [rotuloRodapeCards, carregandoResumo, dadosResumo, erroResumo])

  const cardItensPorPedidoProps = useMemo(() => {
    const carregando = carregandoResumo && dadosResumo == null
    if (erroResumo) {
      return {
        valor: '—',
        badge: '—',
        rodape: 'Erro ao carregar itens por pedido',
        badgePositivo: false,
      }
    }
    if (carregando) {
      return {
        valor: '…',
        badge: '…',
        rodape: `${rotuloRodapeCards}: …`,
        badgePositivo: true,
      }
    }
    const itensAtual = dadosResumo?.atual?.itensPorPedido ?? 0
    const itensAnterior = dadosResumo?.anterior?.itensPorPedido ?? 0
    const comparacao = dadosResumo?.comparacao?.itensPorPedido
    
    return {
      valor: formatarItensPorPedido(itensAtual),
      badge: comparacao?.status === 'sem_base' ? 'Novo' : `${(comparacao?.percentual ?? 0) > 0 ? '+' : ''}${comparacao?.percentual ?? 0}%`,
      rodape: `${rotuloRodapeCards}: ${formatarItensPorPedido(itensAnterior)}`,
      badgePositivo: comparacao?.status === 'positivo' || comparacao?.status === 'neutro' || comparacao?.status === 'sem_base',
    }
  }, [rotuloRodapeCards, carregandoResumo, dadosResumo, erroResumo])

  const cardCancelamentosProps = useMemo(() => {
    const carregando = carregandoResumo && dadosResumo == null
    if (erroResumo) {
      return {
        valor: '—',
        badge: '—',
        rodape: 'Erro ao carregar cancelamentos',
        badgePositivo: false,
      }
    }
    if (carregando) {
      return {
        valor: '…',
        badge: '…',
        rodape: `${rotuloRodapeCards}: …`,
        badgePositivo: true,
      }
    }
    const atual = dadosResumo?.atual?.canceladas?.countVendasCanceladas ?? 0
    const anterior = dadosResumo?.anterior?.canceladas?.countVendasCanceladas ?? 0
    const comparacao = dadosResumo?.comparacao?.countVendasCanceladas
    
    let badgeTexto = '0% Baixo'
    if (comparacao?.status === 'sem_base') badgeTexto = 'Novo +Alto'
    else if (atual > anterior) badgeTexto = `${(comparacao?.percentual ?? 0) > 0 ? '+' : ''}${comparacao?.percentual ?? 0}% +Alto`
    else badgeTexto = `${Math.abs(comparacao?.percentual ?? 0)}% +Baixo`
    
    return {
      valor: formatarContagemPedidos(atual),
      badge: badgeTexto,
      rodape: `${rotuloRodapeCards}: ${formatarContagemPedidos(anterior)}`,
      badgePositivo: comparacao?.status === 'positivo' || comparacao?.status === 'neutro',
    }
  }, [rotuloRodapeCards, carregandoResumo, dadosResumo, erroResumo])

  return (
    <div className="mx-2 mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2 md:mx-4 xl:grid-cols-4">
      <MetricCard
        tituloBase="Pedidos"
        tituloPeriodo={rotuloPeriodoTituloCard(periodoData)}
        icon={
          <div className="relative flex h-8 w-8 items-center justify-center">
            <MdReceiptLong className="text-[#1E3A8A]" size={30} aria-hidden />
            <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center">
              <MdAdd className="font-bold text-[#00B074]" size={34} />
            </span>
          </div>
        }
        valor={cardPedidosHojeProps.valor}
        badge={cardPedidosHojeProps.badge}
        rodape={cardPedidosHojeProps.rodape}
        badgePositivo={cardPedidosHojeProps.badgePositivo}
      />
      <MetricCard
        tituloBase="Ticket médio"
        tituloPeriodo={rotuloPeriodoTituloCard(periodoData)}
        icon={<TbReceiptFilled size={32} />}
        valor={cardTicketMedioProps.valor}
        badge={cardTicketMedioProps.badge}
        rodape={cardTicketMedioProps.rodape}
        badgePositivo={cardTicketMedioProps.badgePositivo}
      />
      <MetricCard
        tituloBase="Itens por pedido"
        tituloPeriodo={rotuloPeriodoTituloCard(periodoData)}
        icon={<MdRestaurantMenu size={32} />}
        valor={cardItensPorPedidoProps.valor}
        badge={cardItensPorPedidoProps.badge}
        rodape={cardItensPorPedidoProps.rodape}
        badgePositivo={cardItensPorPedidoProps.badgePositivo}
      />
      <MetricCard
        tituloBase="Cancelamentos"
        tituloPeriodo={rotuloPeriodoTituloCard(periodoData)}
        icon={
          <div className="relative flex h-8 w-8 items-center justify-center">
            <IoReceipt className="text-[#1E3A8A]" size={30} aria-hidden />
            <span
              className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#D92D20] ring-2 ring-violet-100"
              aria-hidden
            >
              <X className="h-2.5 w-2.5 text-white" strokeWidth={3} />
            </span>
          </div>
        }
        valor={cardCancelamentosProps.valor}
        badge={cardCancelamentosProps.badge}
        rodape={cardCancelamentosProps.rodape}
        badgePositivo={cardCancelamentosProps.badgePositivo}
      />
    </div>
  )
}