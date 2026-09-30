import type { IconType } from 'react-icons'
import type { DeliveryEtapaId } from '@/src/shared/constants/configuracoesRoutes'
import type { DeliveryHubProgresso } from '@/src/presentation/components/features/delivery/hub/deliveryHubProgresso'
import { DELIVERY_HUB_ETAPAS } from '@/src/presentation/components/features/delivery/hub/deliveryHubEtapas'
import type { DeliveryHubPassosExtras } from '@/src/presentation/components/features/delivery/hub/deliveryHubCadastros'

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

function concluidoEtapaRecomendada(
  etapaId: DeliveryEtapaId,
  extras?: DeliveryHubPassosExtras
): boolean {
  if (etapaId === 'delivery-entregadores') return (extras?.qtdEntregadores ?? 0) > 0
  if (etapaId === 'delivery-meios') return (extras?.qtdMeiosPagamento ?? 0) > 0
  if (etapaId === 'delivery-impressoras') return (extras?.qtdImpressoras ?? 0) > 0
  if (etapaId === 'delivery-design') return extras?.empresaDeliveryConfigurada === true
  return false
}

export function montarPassosHubDelivery(
  progresso: DeliveryHubProgresso,
  extras?: DeliveryHubPassosExtras
): DeliveryHubPassoUi[] {
  return DELIVERY_HUB_ETAPAS.map(etapa => {
    const doProgresso = progresso.passos.find(passo => passo.id === etapa.id)
    const concluido = etapa.obrigatoria
      ? (doProgresso?.concluido ?? false)
      : concluidoEtapaRecomendada(etapa.id, extras)
    return {
      id: etapa.id,
      numero: etapa.step,
      titulo: etapa.title,
      descricao: etapa.descricao,
      Icon: etapa.icon,
      concluido,
      obrigatoria: etapa.obrigatoria,
      href: etapa.path,
      etapaId: etapa.id,
      cta: !etapa.obrigatoria && concluido ? 'Editar' : etapa.cta,
    }
  })
}
