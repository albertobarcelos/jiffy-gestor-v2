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
  DESIGN_TABS,
  designSectionTabId,
  deliveryHubDesignSectionPath,
  isDeliveryDesignSectionTabId,
  type DeliveryDesignSectionTabId,
} from '@/src/presentation/components/features/delivery-publico/shared/constants/designTabs'
import {
  AgendaDeliveryEtapa,
  CoberturaDeliveryTab,
  DesignDeliveryEtapa,
  EmpresaDeliveryEtapa,
  EntregadoresDeliveryEtapa,
  ImpressorasDeliveryEtapa,
  LojaDeliveryEtapa,
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

export type DeliveryHubTabId =
  | DeliveryEtapaId
  | DeliveryDesignSectionTabId
  | typeof DELIVERY_HUB_TAB_ID

export interface DeliveryEtapaConfig {
  id: DeliveryEtapaId | DeliveryDesignSectionTabId
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

/** Itens do grupo Loja no menu do hub (sem Empresa/endereço). */
export const DELIVERY_LOJA_CARD_IDS: DeliveryEtapaId[] = [
  'delivery-cobertura',
  'delivery-agenda',
  'delivery-design',
  'delivery-notificacoes',
]

/** Itens do grupo Operações no menu do hub. */
export const DELIVERY_OPERACAO_ETAPA_IDS: DeliveryEtapaId[] = [
  'delivery-entregadores',
  'delivery-meios',
  'delivery-impressoras',
]

/**
 * Rota legada `/config/delivery/loja` — redireciona ao hub.
 * Mantida para deep links e abas antigas.
 */
export const DELIVERY_LOJA_ETAPA: DeliveryEtapaConfig = {
  id: 'delivery-loja',
  step: 0,
  title: 'Configurações Delivery',
  label: 'Delivery',
  descricao: 'Redireciona ao hub de configurações.',
  path: deliveryHubEtapaPath('delivery-loja'),
  component: LojaDeliveryEtapa,
  icon: MdStorefront,
  cta: 'Abrir',
  obrigatoria: false,
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
    title: 'Nome da Loja',
    label: 'Nome da Loja',
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
    title: 'Personalizar Loja',
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
    title: 'Meios de Pagamento',
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

/** Abas virtuais das seções do Design (mesmo shell `/config/delivery/design`). */
export const DELIVERY_DESIGN_SECTION_ETAPAS: DeliveryEtapaConfig[] = DESIGN_TABS.map(tab => ({
  id: designSectionTabId(tab.id),
  step: 3,
  title: tab.label,
  label: tab.label,
  descricao: tab.descricao,
  path: deliveryHubDesignSectionPath(tab.id),
  component: DesignDeliveryEtapa,
  icon: tab.icon,
  cta: tab.cta,
  obrigatoria: false,
}))

export function isDeliveryTabId(value: string | null | undefined): boolean {
  if (!value) return false
  return (
    value === DELIVERY_HUB_TAB_ID ||
    isDeliveryEtapaId(value) ||
    isDeliveryDesignSectionTabId(value)
  )
}

export function getDeliveryEtapaById(id: string): DeliveryEtapaConfig | undefined {
  if (id === DELIVERY_LOJA_ETAPA.id) return DELIVERY_LOJA_ETAPA
  if (isDeliveryDesignSectionTabId(id)) {
    return DELIVERY_DESIGN_SECTION_ETAPAS.find(e => e.id === id)
  }
  return DELIVERY_HUB_ETAPAS.find(e => e.id === id)
}
