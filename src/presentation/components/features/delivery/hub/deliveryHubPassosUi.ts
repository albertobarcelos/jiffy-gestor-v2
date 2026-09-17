import type { IconType } from 'react-icons'
import type { DeliveryEtapaId } from '@/src/shared/constants/configuracoesRoutes'
import type { DeliveryHubProgresso } from '@/src/presentation/components/features/delivery/hub/deliveryHubProgresso'
import {
  DELIVERY_HUB_ETAPAS,
  DELIVERY_LOJA_CARD_IDS,
  DELIVERY_OPERACAO_ETAPA_IDS,
  getDeliveryEtapaById,
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
  if (!etapa || etapa.id === 'delivery-loja') return null
  const doProgresso = progresso?.passos.find(passo => passo.id === etapa.id)
  const recomendada = concluidoEtapaRecomendada(etapa.id, extras)
  const concluido = recomendada ?? doProgresso?.concluido ?? false
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
}

/** Timeline completa (legado / testes). */
export function montarPassosHubDelivery(
  progresso: DeliveryHubProgresso,
  extras?: DeliveryHubPassosExtras
): DeliveryHubPassoUi[] {
  return DELIVERY_HUB_ETAPAS.map(etapa => {
    const passo = montarPassoUi(etapa.id, progresso, extras)
    return passo!
  })
}

/** Cards do lobby Configurar Loja. */
export function montarPassosLojaHub(
  progresso: DeliveryHubProgresso,
  extras?: DeliveryHubPassosExtras
): DeliveryHubPassoUi[] {
  return DELIVERY_LOJA_CARD_IDS.map(id => montarPassoUi(id, progresso, extras)).filter(
    (passo): passo is DeliveryHubPassoUi => passo != null
  )
}

/** Itens de operação na home do hub. */
export function montarPassosOperacaoHub(extras?: DeliveryHubPassosExtras): DeliveryHubPassoUi[] {
  return DELIVERY_OPERACAO_ETAPA_IDS.map(id => montarPassoUi(id, null, extras)).filter(
    (passo): passo is DeliveryHubPassoUi => passo != null
  )
}
