import {
  EMPRESA_DELIVERY_PENDENCIA_TYPES,
  pendenciaEhObrigatoria,
  type EmpresaDeliveryPendenciaItem,
} from '@/src/shared/constants/empresaDeliveryPendencias'
import {
  DELIVERY_HUB_PATH,
  type DeliveryEtapaId,
} from '@/src/presentation/components/features/delivery/hub/deliveryHubEtapas'
import { configuracoesTabPath } from '@/src/shared/constants/configuracoesRoutes'

export type DeliveryPassoChecklistId = DeliveryEtapaId | 'delivery-geolocalizacao'

export type DeliveryPassoChecklist = {
  id: DeliveryPassoChecklistId
  label: string
  obrigatoria: boolean
  concluido: boolean
  etapaId?: DeliveryEtapaId
  href?: string
}

const PASSOS_BASE: Omit<DeliveryPassoChecklist, 'concluido'>[] = [
  {
    id: 'delivery-geolocalizacao',
    label: 'Geolocalização da empresa',
    obrigatoria: true,
    href: `${configuracoesTabPath('empresa')}#geolocalizacao-empresa`,
  },
  {
    id: 'delivery-cobertura',
    label: 'Cobertura de entrega',
    obrigatoria: true,
    etapaId: 'delivery-cobertura',
  },
]

const TIPOS_POR_PASSO: Record<DeliveryPassoChecklistId, string[]> = {
  'delivery-geolocalizacao': [EMPRESA_DELIVERY_PENDENCIA_TYPES.GEOLOCALIZACAO_NAO_CONFIGURADA],
  'delivery-cobertura': [EMPRESA_DELIVERY_PENDENCIA_TYPES.COBERTURA_NAO_CONFIGURADA],
}

function temPendenciaDoTipo(
  pendencias: EmpresaDeliveryPendenciaItem[],
  tipos: string[]
): boolean {
  if (tipos.length === 0) return false
  return pendencias.some(p => tipos.includes(p.type))
}

export type DeliveryHubProgresso = {
  passos: DeliveryPassoChecklist[]
  passosObrigatorios: DeliveryPassoChecklist[]
  totalObrigatorios: number
  concluidosObrigatorios: number
  porcentagemObrigatorias: number
}

/**
 * Progresso reduzido do hub: geo da empresa + cobertura.
 */
export function calcularDeliveryHubProgresso(
  pendencias: EmpresaDeliveryPendenciaItem[] | undefined,
  _empresaConfigurada: boolean
): DeliveryHubProgresso {
  const lista = pendencias ?? []

  const passos: DeliveryPassoChecklist[] = PASSOS_BASE.map(passo => {
    const tipos = TIPOS_POR_PASSO[passo.id]
    let concluido = !temPendenciaDoTipo(lista, tipos)
    let obrigatoria = passo.obrigatoria
    const pendenciaRelacionada = lista.find(p => tipos.includes(p.type))
    if (pendenciaRelacionada) {
      obrigatoria = pendenciaEhObrigatoria(pendenciaRelacionada)
    }
    // Se a API não envia pendências, não marcar geo/cobertura como concluídos à força
    if (lista.length === 0 && passo.id === 'delivery-cobertura') {
      concluido = false
    }
    return { ...passo, obrigatoria, concluido }
  })

  const passosObrigatorios = passos.filter(p => p.obrigatoria)
  const concluidosObrigatorios = passosObrigatorios.filter(p => p.concluido).length
  const totalObrigatorios = passosObrigatorios.length
  const porcentagemObrigatorias =
    totalObrigatorios === 0
      ? 100
      : Math.round((concluidosObrigatorios / totalObrigatorios) * 100)

  return {
    passos,
    passosObrigatorios,
    totalObrigatorios,
    concluidosObrigatorios,
    porcentagemObrigatorias,
  }
}

export function deliveryHubAbrirEtapaHref(etapaId: DeliveryEtapaId): string {
  return `${DELIVERY_HUB_PATH}?abrir=${encodeURIComponent(etapaId)}`
}
