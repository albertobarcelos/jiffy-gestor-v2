import type { ComponentType } from 'react'
import type { IconType } from 'react-icons'
import { FaWhatsapp } from 'react-icons/fa'
import {
  MdPalette,
  MdRadar,
  MdSchedule,
  MdStorefront,
} from 'react-icons/md'
import { DELIVERY_HUB_PATH } from '@/src/shared/constants/configuracoesRoutes'
import { DeliveryNomeCardapioView } from './DeliveryNomeCardapioView'
import { DeliveryAgendaView } from './DeliveryAgendaView'
import { DeliveryDesignEtapaView } from './DeliveryDesignEtapaView'
import { CoberturaDeliveryTab } from '@/src/presentation/components/features/configuracoes/tabs/CoberturaDeliveryTab'
import { NotificacoesWhatsAppDeliveryEtapa } from '@/src/presentation/components/features/delivery/hub/DeliveryEtapaPaineis'

export { DELIVERY_HUB_PATH }

export const DELIVERY_HUB_TAB_ID = 'delivery-hub'

export type DeliveryHubEtapaId =
  | 'delivery-nome-cardapio'
  | 'delivery-design'
  | 'delivery-agenda'
  | 'delivery-cobertura'
  | 'delivery-notificacoes'

export type DeliveryEtapaId = DeliveryHubEtapaId

export interface DeliveryEtapaConfig {
  id: DeliveryHubEtapaId
  step: number
  title: string
  label: string
  descricao?: string
  path: string
  component: ComponentType
  icon: IconType
  /** Exige Empresa Delivery já criada (slug/menu salvos). */
  requerEmpresaDelivery?: boolean
  botaoLabel?: string
  cta?: string
  obrigatoria?: boolean
}

export const DELIVERY_HUB_ETAPAS: DeliveryEtapaConfig[] = [
  {
    id: 'delivery-nome-cardapio',
    step: 1,
    title: 'Configurar nome da loja e cardápio',
    label: 'Nome e cardápio',
    descricao: 'Slug, menu e link público da loja.',
    path: DELIVERY_HUB_PATH,
    component: DeliveryNomeCardapioView,
    icon: MdStorefront,
    botaoLabel: 'Configurar',
    cta: 'Configurar',
    obrigatoria: true,
  },
  {
    id: 'delivery-design',
    step: 2,
    title: 'Personalizar loja',
    label: 'Design da loja',
    descricao: 'Logo, banner e identidade do cardápio.',
    path: DELIVERY_HUB_PATH,
    component: DeliveryDesignEtapaView,
    icon: MdPalette,
    requerEmpresaDelivery: true,
    botaoLabel: 'Design',
    cta: 'Design',
    obrigatoria: false,
  },
  {
    id: 'delivery-agenda',
    step: 3,
    title: 'Agenda e funcionamento',
    label: 'Agenda e funcionamento',
    descricao: 'Horários em que a loja aceita pedidos.',
    path: DELIVERY_HUB_PATH,
    component: DeliveryAgendaView,
    icon: MdSchedule,
    requerEmpresaDelivery: true,
    botaoLabel: 'Abrir',
    cta: 'Abrir',
    obrigatoria: true,
  },
  {
    id: 'delivery-cobertura',
    step: 4,
    title: 'Cobertura delivery',
    label: 'Cobertura delivery',
    descricao: 'Raio em km e áreas com taxa própria no mapa.',
    path: DELIVERY_HUB_PATH,
    component: CoberturaDeliveryTab,
    icon: MdRadar,
    requerEmpresaDelivery: true,
    botaoLabel: 'Abrir',
    cta: 'Editar',
    obrigatoria: true,
  },
  {
    id: 'delivery-notificacoes',
    step: 5,
    title: 'Notificações WhatsApp',
    label: 'WhatsApp',
    descricao: 'Avisos automáticos do pedido no WhatsApp do cliente.',
    path: DELIVERY_HUB_PATH,
    component: NotificacoesWhatsAppDeliveryEtapa,
    icon: FaWhatsapp,
    requerEmpresaDelivery: true,
    botaoLabel: 'Ver e editar',
    cta: 'Ver e editar',
    obrigatoria: false,
  },
]

export function isDeliveryEtapaId(value: string): value is DeliveryHubEtapaId {
  return DELIVERY_HUB_ETAPAS.some(e => e.id === value)
}

export function isDeliveryTabId(value: string | null | undefined): boolean {
  if (!value) return false
  return value === DELIVERY_HUB_TAB_ID || isDeliveryEtapaId(value)
}

export function getDeliveryEtapaById(id: string): DeliveryEtapaConfig | undefined {
  return DELIVERY_HUB_ETAPAS.find(e => e.id === id)
}
