import {
  pendenciaEhObrigatoria,
  type EmpresaDeliveryPendenciaItem,
  EMPRESA_DELIVERY_PENDENCIA_TYPES,
} from '@/src/shared/constants/empresaDeliveryPendencias'
import {
  deliveryHubEtapaPath,
  type DeliveryEtapaId,
} from '@/src/shared/constants/configuracoesRoutes'

export type DeliveryPassoChecklistId = 'delivery-geolocalizacao' | 'delivery-cobertura'

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
    label: 'Endereço da empresa',
    obrigatoria: true,
    etapaId: 'delivery-geolocalizacao',
    href: deliveryHubEtapaPath('delivery-geolocalizacao'),
  },
  {
    id: 'delivery-cobertura',
    label: 'Cobertura de entrega',
    obrigatoria: true,
    etapaId: 'delivery-cobertura',
    href: deliveryHubEtapaPath('delivery-cobertura'),
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
  empresaConfigurada: boolean
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
    if (lista.length === 0) {
      concluido = empresaConfigurada
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
