import type { IconType } from 'react-icons'
import type { DeliveryEtapaId } from '@/src/shared/constants/configuracoesRoutes'
import type { DeliveryHubProgresso } from '@/src/presentation/components/features/delivery/hub/deliveryHubProgresso'
import { DELIVERY_HUB_ETAPAS } from '@/src/presentation/components/features/delivery/hub/deliveryHubEtapas'

export type DeliveryHubPassoUi = {
  id: DeliveryEtapaId
  numero: number
  titulo: string
  descricao: string
  Icon: IconType
  concluido: boolean
  obrigatoria: boolean
  href: string
  etapaId: DeliveryEtapaId
  cta: string
}

export function montarPassosHubDelivery(progresso: DeliveryHubProgresso): DeliveryHubPassoUi[] {
  return DELIVERY_HUB_ETAPAS.map(etapa => {
    const doProgresso = progresso.passos.find(passo => passo.id === etapa.id)
    return {
      id: etapa.id,
      numero: etapa.step,
      titulo: etapa.title,
      descricao: etapa.descricao,
      Icon: etapa.icon,
      concluido: doProgresso?.concluido ?? false,
      obrigatoria: etapa.obrigatoria,
      href: etapa.path,
      etapaId: etapa.id,
      cta: etapa.cta,
    }
  })
}
