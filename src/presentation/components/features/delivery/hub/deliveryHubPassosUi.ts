import type { IconType } from 'react-icons'
import type { DeliveryHubProgresso } from '@/src/presentation/components/features/delivery/hub/deliveryHubProgresso'
import {
  DELIVERY_HUB_ETAPAS,
  type DeliveryHubEtapaId,
} from '@/src/presentation/components/features/delivery/hub/deliveryHubEtapas'
import type { DeliveryHubPassosExtras } from '@/src/presentation/components/features/delivery/hub/deliveryHubCadastros'

export type DeliveryHubPassoUi = {
  id: DeliveryHubEtapaId
  numero: number
  titulo: string
  descricao: string
  Icon: IconType
  concluido: boolean
  obrigatoria: boolean
  href: string
  etapaId: DeliveryHubEtapaId
  cta: string
}

function concluidoEtapaRecomendada(
  etapaId: DeliveryHubEtapaId,
  extras?: DeliveryHubPassosExtras
): boolean | null {
  if (etapaId === 'delivery-notificacoes') return extras?.whatsappConectado === true
  return null
}

export function montarPassosHubDelivery(
  progresso: DeliveryHubProgresso,
  extras?: DeliveryHubPassosExtras
): DeliveryHubPassoUi[] {
  return DELIVERY_HUB_ETAPAS.map(etapa => {
    const doProgresso = progresso.passos.find(passo => passo.id === etapa.id)
    const recomendada = concluidoEtapaRecomendada(etapa.id, extras)
    const concluido = recomendada ?? doProgresso?.concluido ?? false
    const obrigatoria = etapa.obrigatoria ?? false
    return {
      id: etapa.id,
      numero: etapa.step,
      titulo: etapa.title,
      descricao: etapa.descricao ?? etapa.title,
      Icon: etapa.icon,
      concluido,
      obrigatoria,
      href: etapa.path,
      etapaId: etapa.id,
      cta: !obrigatoria && concluido ? 'Editar' : (etapa.cta ?? etapa.botaoLabel ?? 'Abrir'),
    }
  })
}
