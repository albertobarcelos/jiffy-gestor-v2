import type { IconType } from 'react-icons'
import { MdRadar } from 'react-icons/md'
import { configuracoesTabPath } from '@/src/shared/constants/configuracoesRoutes'
import { CoberturaDeliveryTab } from '@/src/presentation/components/features/configuracoes/tabs/CoberturaDeliveryTab'

/** Path único do hub — etapas são abas SPA (tabsStore), sem troca de rota. */
export const DELIVERY_HUB_PATH = configuracoesTabPath('empresa-delivery')

export const DELIVERY_HUB_TAB_ID = 'delivery-hub'

export type DeliveryEtapaId = 'delivery-cobertura'

export interface DeliveryEtapaConfig {
  id: DeliveryEtapaId
  step: number
  title: string
  label: string
  path: string
  component: React.ComponentType
  icon: IconType
  /** Texto do botão no card (opcional). */
  botaoLabel?: string
}

/** Nesta branch: apenas Cobertura (sem nome/design/agenda). */
export const DELIVERY_HUB_ETAPAS: DeliveryEtapaConfig[] = [
  {
    id: 'delivery-cobertura',
    step: 1,
    title: 'Cobertura delivery',
    label: 'Cobertura delivery',
    path: DELIVERY_HUB_PATH,
    component: CoberturaDeliveryTab,
    icon: MdRadar,
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
