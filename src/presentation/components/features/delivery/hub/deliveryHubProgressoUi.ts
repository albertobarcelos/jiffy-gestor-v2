import type { DeliveryPassoChecklistId } from '@/src/application/delivery/calcularDeliveryHubProgresso'
import {
  deliveryHubEtapaPath,
  type DeliveryEtapaId,
} from '@/src/shared/constants/configuracoesRoutes'

export type DeliveryPassoChecklistUi = {
  id: DeliveryPassoChecklistId
  label: string
  href: string
  etapaId: DeliveryEtapaId
}

export const DELIVERY_HUB_PASSO_UI: Record<DeliveryPassoChecklistId, DeliveryPassoChecklistUi> = {
  'delivery-geolocalizacao': {
    id: 'delivery-geolocalizacao',
    label: 'Empresa e endereço',
    etapaId: 'delivery-geolocalizacao',
    href: deliveryHubEtapaPath('delivery-geolocalizacao'),
  },
  'delivery-nome-cardapio': {
    id: 'delivery-nome-cardapio',
    label: 'Nome da loja e cardápio',
    etapaId: 'delivery-nome-cardapio',
    href: `${deliveryHubEtapaPath('delivery-design')}?secao=nome-cardapio`,
  },
  'delivery-agenda': {
    id: 'delivery-agenda',
    label: 'Agenda e funcionamento',
    etapaId: 'delivery-agenda',
    href: deliveryHubEtapaPath('delivery-agenda'),
  },
  'delivery-cobertura': {
    id: 'delivery-cobertura',
    label: 'Áreas de entrega e Geo da Empresa',
    etapaId: 'delivery-cobertura',
    href: deliveryHubEtapaPath('delivery-cobertura'),
  },
}

export function vestirPassoHubProgresso(id: DeliveryPassoChecklistId): DeliveryPassoChecklistUi {
  return DELIVERY_HUB_PASSO_UI[id]
}
