import type { IconType } from 'react-icons'
import type { DeliveryEtapaId } from '@/src/shared/constants/configuracoesRoutes'
import type { DeliveryHubProgresso } from '@/src/presentation/components/features/delivery/hub/deliveryHubProgresso'
import {
  DELIVERY_HUB_ETAPAS,
  DELIVERY_LOJA_CARD_IDS,
  DELIVERY_OPERACAO_ETAPA_IDS,
  getDeliveryEtapaById,
  isDeliveryEtapaId,
} from '@/src/presentation/components/features/delivery/hub/deliveryHubEtapas'
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

export function concluidoEtapaRecomendada(
  etapaId: DeliveryEtapaId,
  extras?: DeliveryHubPassosExtras
): boolean | null {
  if (etapaId === 'delivery-notificacoes') return extras?.whatsappConectado === true
  if (etapaId === 'delivery-entregadores') return (extras?.qtdEntregadores ?? 0) > 0
  if (etapaId === 'delivery-meios') return (extras?.qtdMeiosPagamento ?? 0) > 0
  if (etapaId === 'delivery-impressoras') return (extras?.qtdImpressoras ?? 0) > 0
  if (etapaId === 'delivery-nome-cardapio' || etapaId === 'delivery-design') {
    return extras?.empresaDeliveryConfigurada === true
  }
  if (etapaId === 'delivery-agenda') return extras?.agendaConfigurada === true
  return null
}

function montarPassoUi(
  etapaId: DeliveryEtapaId,
  progresso: DeliveryHubProgresso | null,
  extras?: DeliveryHubPassosExtras
): DeliveryHubPassoUi | null {
  const etapa = getDeliveryEtapaById(etapaId)
  if (!etapa || etapaId === 'delivery-loja') return null
  const doProgresso = progresso?.passos.find(passo => passo.id === etapaId)
  const recomendada = concluidoEtapaRecomendada(etapaId, extras)
  const concluido = recomendada ?? doProgresso?.concluido ?? false
  return {
    id: etapaId,
    numero: etapa.step,
    titulo: etapa.title,
    descricao: etapa.descricao,
    Icon: etapa.icon,
    concluido,
    obrigatoria: etapa.obrigatoria,
    href: etapa.path,
    etapaId,
    cta: !etapa.obrigatoria && concluido ? 'Editar' : etapa.cta,
  }
}

/** Timeline completa (legado / testes). */
export function montarPassosHubDelivery(
  progresso: DeliveryHubProgresso,
  extras?: DeliveryHubPassosExtras
): DeliveryHubPassoUi[] {
  return DELIVERY_HUB_ETAPAS.flatMap(etapa => {
    if (!isDeliveryEtapaId(etapa.id)) return []
    const passo = montarPassoUi(etapa.id, progresso, extras)
    return passo ? [passo] : []
  })
}

/** Itens do grupo Loja no menu do hub. */
export function montarPassosLojaHub(
  progresso: DeliveryHubProgresso,
  extras?: DeliveryHubPassosExtras
): DeliveryHubPassoUi[] {
  return DELIVERY_LOJA_CARD_IDS.map(id => montarPassoUi(id, progresso, extras)).filter(
    (passo): passo is DeliveryHubPassoUi => passo != null
  )
}

/** Itens do grupo Operações no menu do hub. */
export function montarPassosOperacaoHub(extras?: DeliveryHubPassosExtras): DeliveryHubPassoUi[] {
  return DELIVERY_OPERACAO_ETAPA_IDS.map(id => montarPassoUi(id, null, extras)).filter(
    (passo): passo is DeliveryHubPassoUi => passo != null
  )
}
