import type { IconType } from 'react-icons'
import {
  MdPalette,
  MdRadar,
  MdSchedule,
  MdStorefront,
} from 'react-icons/md'
import { configuracoesTabPath } from '@/src/shared/constants/configuracoesRoutes'
import { DeliveryNomeCardapioView } from './DeliveryNomeCardapioView'
import { DeliveryAgendaView } from './DeliveryAgendaView'
import { DeliveryDesignEtapaView } from './DeliveryDesignEtapaView'
import { CoberturaDeliveryTab } from '@/src/presentation/components/features/configuracoes/tabs/CoberturaDeliveryTab'

/** Path único do hub — etapas são abas SPA (tabsStore), sem troca de rota. */
export const DELIVERY_HUB_PATH = configuracoesTabPath('empresa-delivery')

export const DELIVERY_HUB_TAB_ID = 'delivery-hub'

export type DeliveryEtapaId =
  | 'delivery-nome-cardapio'
  | 'delivery-design'
  | 'delivery-agenda'
  | 'delivery-cobertura'

export interface DeliveryEtapaConfig {
  id: DeliveryEtapaId
  step: number
  title: string
  label: string
  path: string
  component: React.ComponentType
  icon: IconType
  /** Exige Empresa Delivery já criada (slug/menu salvos). */
  requerEmpresaDelivery?: boolean
  /** Texto do botão no card (opcional). */
  botaoLabel?: string
}

export const DELIVERY_HUB_ETAPAS: DeliveryEtapaConfig[] = [
  {
    id: 'delivery-nome-cardapio',
    step: 1,
    title: 'Configurar nome da loja e cardápio',
    label: 'Nome e cardápio',
    path: DELIVERY_HUB_PATH,
    component: DeliveryNomeCardapioView,
    icon: MdStorefront,
    botaoLabel: 'Configurar',
  },
  {
    id: 'delivery-design',
    step: 2,
    title: 'Personalizar loja',
    label: 'Design da loja',
    path: DELIVERY_HUB_PATH,
    component: DeliveryDesignEtapaView,
    icon: MdPalette,
    requerEmpresaDelivery: true,
    botaoLabel: 'Design',
  },
  {
    id: 'delivery-agenda',
    step: 3,
    title: 'Agenda e funcionamento',
    label: 'Agenda e funcionamento',
    path: DELIVERY_HUB_PATH,
    component: DeliveryAgendaView,
    icon: MdSchedule,
    requerEmpresaDelivery: true,
    botaoLabel: 'Abrir',
  },
  {
    id: 'delivery-cobertura',
    step: 4,
    title: 'Cobertura delivery',
    label: 'Cobertura delivery',
    path: DELIVERY_HUB_PATH,
    component: CoberturaDeliveryTab,
    icon: MdRadar,
    requerEmpresaDelivery: true,
    botaoLabel: 'Abrir',
  },
]

export function isDeliveryEtapaId(value: string): value is DeliveryEtapaId {
  return DELIVERY_HUB_ETAPAS.some(e => e.id === value)
}

export function isDeliveryTabId(value: string | null | undefined): boolean {
  if (!value) return false
  return value === DELIVERY_HUB_TAB_ID || isDeliveryEtapaId(value)
}

export function getDeliveryEtapaById(id: string): DeliveryEtapaConfig | undefined {
  return DELIVERY_HUB_ETAPAS.find(e => e.id === id)
}
