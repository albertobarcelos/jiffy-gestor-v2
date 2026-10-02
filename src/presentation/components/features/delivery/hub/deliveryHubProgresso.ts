import {
  pendenciaEhObrigatoria,
  type EmpresaDeliveryPendenciaItem,
  EMPRESA_DELIVERY_PENDENCIA_TYPES,
} from '@/src/shared/constants/empresaDeliveryPendencias'
import {
  deliveryHubEtapaPath,
  type DeliveryEtapaId,
} from '@/src/shared/constants/configuracoesRoutes'

export type DeliveryPassoChecklistId =
  | 'delivery-geolocalizacao'
  | 'delivery-nome-cardapio'
  | 'delivery-agenda'
  | 'delivery-cobertura'

export type DeliveryPassoChecklist = {
  id: DeliveryPassoChecklistId
  label: string
  obrigatoria: boolean
  concluido: boolean
  etapaId: DeliveryEtapaId
  href: string
}

/** Sinais locais: a API não marca agenda/cobertura como obrigatórias de forma confiável. */
export type DeliveryHubProgressoSinais = {
  agendaConfigurada?: boolean
  coberturaConfigurada?: boolean
}

const PASSOS_BASE: Omit<DeliveryPassoChecklist, 'concluido'>[] = [
  {
    id: 'delivery-geolocalizacao',
    label: 'Empresa e endereço',
    obrigatoria: true,
    etapaId: 'delivery-geolocalizacao',
    href: deliveryHubEtapaPath('delivery-geolocalizacao'),
  },
  {
    id: 'delivery-nome-cardapio',
    label: 'Nome da loja e cardápio',
    obrigatoria: true,
    etapaId: 'delivery-nome-cardapio',
    href: `${deliveryHubEtapaPath('delivery-design')}?secao=nome-cardapio`,
  },
  {
    id: 'delivery-agenda',
    label: 'Agenda e funcionamento',
    obrigatoria: true,
    etapaId: 'delivery-agenda',
    href: deliveryHubEtapaPath('delivery-agenda'),
  },
  {
    id: 'delivery-cobertura',
    label: 'Áreas de entrega e Geo da Empresa',
    obrigatoria: true,
    etapaId: 'delivery-cobertura',
    href: deliveryHubEtapaPath('delivery-cobertura'),
  },
]

const TIPOS_POR_PASSO: Record<DeliveryPassoChecklistId, string[]> = {
  'delivery-geolocalizacao': [EMPRESA_DELIVERY_PENDENCIA_TYPES.TIMEZONE_NAO_CONFIGURADO],
  'delivery-nome-cardapio': [
    EMPRESA_DELIVERY_PENDENCIA_TYPES.EMPRESA_DELIVERY_NAO_CONFIGURADA,
    EMPRESA_DELIVERY_PENDENCIA_TYPES.CARDAPIO_DELIVERY_NAO_CONFIGURADO,
  ],
  'delivery-agenda': [EMPRESA_DELIVERY_PENDENCIA_TYPES.FUNCIONAMENTO_AGENDA_NAO_CONFIGURADA],
  'delivery-cobertura': [
    EMPRESA_DELIVERY_PENDENCIA_TYPES.GEOLOCALIZACAO_NAO_CONFIGURADA,
    EMPRESA_DELIVERY_PENDENCIA_TYPES.COBERTURA_NAO_CONFIGURADA,
  ],
}

function temPendenciaObrigatoriaDoTipo(
  pendencias: EmpresaDeliveryPendenciaItem[],
  tipos: string[]
): boolean {
  if (tipos.length === 0) return false
  return pendencias.some(p => tipos.includes(p.type) && pendenciaEhObrigatoria(p))
}

function temPendenciaDoTipo(
  pendencias: EmpresaDeliveryPendenciaItem[],
  tipos: string[]
): boolean {
  if (tipos.length === 0) return false
  return pendencias.some(p => tipos.includes(p.type))
}

function concluidoPasso(
  passoId: DeliveryPassoChecklistId,
  lista: EmpresaDeliveryPendenciaItem[],
  empresaConfigurada: boolean,
  sinais?: DeliveryHubProgressoSinais
): boolean {
  const tipos = TIPOS_POR_PASSO[passoId]

  if (passoId === 'delivery-agenda') {
    if (typeof sinais?.agendaConfigurada === 'boolean') return sinais.agendaConfigurada
    if (temPendenciaDoTipo(lista, tipos)) return false
    return false
  }

  if (passoId === 'delivery-cobertura') {
    // Pin da loja + raio/área: geo vem da API; cobertura ativa do sinal local.
    if (
      temPendenciaObrigatoriaDoTipo(lista, [
        EMPRESA_DELIVERY_PENDENCIA_TYPES.GEOLOCALIZACAO_NAO_CONFIGURADA,
      ])
    ) {
      return false
    }
    if (typeof sinais?.coberturaConfigurada === 'boolean') return sinais.coberturaConfigurada
    if (temPendenciaDoTipo(lista, tipos)) return false
    return false
  }

  if (lista.length === 0) return empresaConfigurada
  return !temPendenciaObrigatoriaDoTipo(lista, tipos)
}

export type DeliveryHubProgresso = {
  passos: DeliveryPassoChecklist[]
  passosObrigatorios: DeliveryPassoChecklist[]
  totalObrigatorios: number
  concluidosObrigatorios: number
  porcentagemObrigatorias: number
}

/**
 * Progresso do hub. Empresa (fuso) e nome/cardápio usam pendências da API;
 * agenda usa funcionamento local; cobertura exige pin (API) + raio/área local.
 */
export function calcularDeliveryHubProgresso(
  pendencias: EmpresaDeliveryPendenciaItem[] | undefined,
  empresaConfigurada: boolean,
  sinais?: DeliveryHubProgressoSinais
): DeliveryHubProgresso {
  const lista = pendencias ?? []

  const passos: DeliveryPassoChecklist[] = PASSOS_BASE.map(passo => ({
    ...passo,
    concluido: concluidoPasso(passo.id, lista, empresaConfigurada, sinais),
  }))

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
