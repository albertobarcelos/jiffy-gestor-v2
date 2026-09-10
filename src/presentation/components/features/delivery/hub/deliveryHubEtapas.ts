import type { ComponentType } from 'react'
import type { IconType } from 'react-icons'
import { FaWhatsapp } from 'react-icons/fa'
import {
  MdCreditCard,
  MdDeliveryDining,
  MdLocationOn,
  MdPalette,
  MdPrint,
  MdSchedule,
  MdStorefront,
} from 'react-icons/md'
import {
  deliveryHubEtapaPath,
  isDeliveryEtapaId,
  type DeliveryEtapaId,
} from '@/src/shared/constants/configuracoesRoutes'
import {
  AgendaDeliveryEtapa,
  CoberturaDeliveryTab,
  DesignDeliveryEtapa,
  EmpresaDeliveryEtapa,
  EntregadoresDeliveryEtapa,
  ImpressorasDeliveryEtapa,
  MeiosDeliveryEtapa,
  NomeCardapioDeliveryEtapa,
  NotificacoesWhatsAppDeliveryEtapa,
} from '@/src/presentation/components/features/delivery/hub/DeliveryEtapaPaineis'

export {
  DELIVERY_HUB_PATH,
  isDeliveryEtapaId,
  type DeliveryEtapaId,
} from '@/src/shared/constants/configuracoesRoutes'

export const DELIVERY_HUB_TAB_ID = 'delivery-hub'

export interface DeliveryEtapaConfig {
  id: DeliveryEtapaId
  step: number
  title: string
  label: string
  descricao: string
  path: string
  component: ComponentType
  icon: IconType
  cta: string
  obrigatoria: boolean
}

export const DELIVERY_HUB_ETAPAS: DeliveryEtapaConfig[] = [
  {
    id: 'delivery-geolocalizacao',
    step: 1,
    title: 'Empresa e endereço',
    label: 'Empresa',
    descricao: 'Endereço da loja usado no pin e na entrega.',
    path: deliveryHubEtapaPath('delivery-geolocalizacao'),
    component: EmpresaDeliveryEtapa,
    icon: MdStorefront,
    cta: 'Editar',
    obrigatoria: true,
  },
  {
    id: 'delivery-nome-cardapio',
    step: 2,
    title: 'Nome da loja e cardápio',
    label: 'Nome e cardápio',
    descricao: 'Slug, menu e link público da loja.',
    path: deliveryHubEtapaPath('delivery-nome-cardapio'),
    component: NomeCardapioDeliveryEtapa,
    icon: MdStorefront,
    cta: 'Configurar',
    obrigatoria: true,
  },
  {
    id: 'delivery-design',
    step: 3,
    title: 'Personalizar loja',
    label: 'Design',
    descricao: 'Logo, banner e identidade do cardápio.',
    path: deliveryHubEtapaPath('delivery-design'),
    component: DesignDeliveryEtapa,
    icon: MdPalette,
    cta: 'Design',
    obrigatoria: false,
  },
  {
    id: 'delivery-agenda',
    step: 4,
    title: 'Agenda e funcionamento',
    label: 'Agenda',
    descricao: 'Horários em que a loja aceita pedidos.',
    path: deliveryHubEtapaPath('delivery-agenda'),
    component: AgendaDeliveryEtapa,
    icon: MdSchedule,
    cta: 'Abrir',
    obrigatoria: true,
  },
  {
    id: 'delivery-cobertura',
    step: 5,
    title: 'Áreas de entrega',
    label: 'Cobertura',
    descricao: 'Raio em km e áreas com taxa própria no mapa.',
    path: deliveryHubEtapaPath('delivery-cobertura'),
    component: CoberturaDeliveryTab,
    icon: MdLocationOn,
    cta: 'Editar',
    obrigatoria: true,
  },
  {
    id: 'delivery-entregadores',
    step: 6,
    title: 'Entregadores',
    label: 'Entregadores',
    descricao: 'Quem sai com os pedidos no quadro.',
    path: deliveryHubEtapaPath('delivery-entregadores'),
    component: EntregadoresDeliveryEtapa,
    icon: MdDeliveryDining,
    cta: 'Ver e editar',
    obrigatoria: false,
  },
  {
    id: 'delivery-meios',
    step: 7,
    title: 'Meios de pagamento',
    label: 'Pagamento',
    descricao: 'Formas usadas no pedido gestor.',
    path: deliveryHubEtapaPath('delivery-meios'),
    component: MeiosDeliveryEtapa,
    icon: MdCreditCard,
    cta: 'Ver e editar',
    obrigatoria: false,
  },
  {
    id: 'delivery-impressoras',
    step: 8,
    title: 'Impressão',
    label: 'Impressão',
    descricao: 'Vínculo das impressoras lógicas neste PC.',
    path: deliveryHubEtapaPath('delivery-impressoras'),
    component: ImpressorasDeliveryEtapa,
    icon: MdPrint,
    cta: 'Ver e editar',
    obrigatoria: false,
  },
  {
    id: 'delivery-notificacoes',
    step: 9,
    title: 'Notificações WhatsApp',
    label: 'WhatsApp',
    descricao: 'Avisos automáticos do pedido no WhatsApp do cliente.',
    path: deliveryHubEtapaPath('delivery-notificacoes'),
    component: NotificacoesWhatsAppDeliveryEtapa,
    icon: FaWhatsapp,
    cta: 'Ver e editar',
    obrigatoria: false,
  },
]

export function isDeliveryTabId(value: string | null | undefined): boolean {
  if (!value) return false
  return value === DELIVERY_HUB_TAB_ID || isDeliveryEtapaId(value)
}

export function getDeliveryEtapaById(id: string): DeliveryEtapaConfig | undefined {
  return DELIVERY_HUB_ETAPAS.find(e => e.id === id)
}
