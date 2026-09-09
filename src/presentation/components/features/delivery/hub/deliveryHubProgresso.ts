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

export type DeliveryPassoChecklistId =
  | DeliveryEtapaId
  | 'delivery-geolocalizacao'
  | 'delivery-timezone'
  | 'delivery-whatsapp'

export type DeliveryPassoChecklist = {
  id: DeliveryPassoChecklistId
  label: string
  obrigatoria: boolean
  concluido: boolean
  /** Abre etapa no hub, se houver. */
  etapaId?: DeliveryEtapaId
  /** Link externo (ex.: aba Empresa). */
  href?: string
}

const PASSOS_BASE: Omit<DeliveryPassoChecklist, 'concluido'>[] = [
  {
    id: 'delivery-nome-cardapio',
    label: 'Nome da loja e cardápio',
    obrigatoria: true,
    etapaId: 'delivery-nome-cardapio',
  },
  {
    id: 'delivery-geolocalizacao',
    label: 'Geolocalização da empresa',
    obrigatoria: true,
    href: `${configuracoesTabPath('empresa')}#geolocalizacao-empresa`,
  },
  {
    id: 'delivery-agenda',
    label: 'Agenda e funcionamento',
    obrigatoria: true,
    etapaId: 'delivery-agenda',
  },
  {
    id: 'delivery-cobertura',
    label: 'Cobertura de entrega',
    obrigatoria: true,
    etapaId: 'delivery-cobertura',
  },
  {
    id: 'delivery-timezone',
    label: 'Fuso horário da empresa',
    obrigatoria: true,
    href: configuracoesTabPath('empresa'),
  },
  {
    id: 'delivery-design',
    label: 'Personalizar design da loja',
    obrigatoria: false,
    etapaId: 'delivery-design',
  },
  {
    id: 'delivery-whatsapp',
    label: 'Canal WhatsApp',
    obrigatoria: false,
    etapaId: undefined,
  },
]

const TIPOS_POR_PASSO: Record<DeliveryPassoChecklistId, string[]> = {
  'delivery-nome-cardapio': [
    EMPRESA_DELIVERY_PENDENCIA_TYPES.EMPRESA_DELIVERY_NAO_CONFIGURADA,
    EMPRESA_DELIVERY_PENDENCIA_TYPES.CARDAPIO_DELIVERY_NAO_CONFIGURADO,
  ],
  'delivery-geolocalizacao': [EMPRESA_DELIVERY_PENDENCIA_TYPES.GEOLOCALIZACAO_NAO_CONFIGURADA],
  'delivery-agenda': [EMPRESA_DELIVERY_PENDENCIA_TYPES.FUNCIONAMENTO_AGENDA_NAO_CONFIGURADA],
  'delivery-cobertura': [EMPRESA_DELIVERY_PENDENCIA_TYPES.COBERTURA_NAO_CONFIGURADA],
  'delivery-timezone': [EMPRESA_DELIVERY_PENDENCIA_TYPES.TIMEZONE_NAO_CONFIGURADO],
  'delivery-design': [],
  'delivery-whatsapp': [EMPRESA_DELIVERY_PENDENCIA_TYPES.CANAL_WHATSAPP_NAO_CONECTADO],
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
 * Progresso do hub Delivery a partir das pendências da API + estado real da empresa.
 * Geo/fuso usam `empresas/me` (mesma fonte da aba Empresa), para não marcar concluído
 * quando a lista de pendências do delivery está vazia (loja ainda não ativada).
 */
export type DeliveryHubProgressoContextoEmpresa = {
  possuiGeolocalizacao: boolean
  timezoneConfigurado: boolean
}

export function calcularDeliveryHubProgresso(
  pendencias: EmpresaDeliveryPendenciaItem[] | undefined,
  empresaConfigurada: boolean,
  contextoEmpresa?: DeliveryHubProgressoContextoEmpresa
): DeliveryHubProgresso {
  const lista = pendencias ?? []
  const possuiGeolocalizacao = contextoEmpresa?.possuiGeolocalizacao ?? null
  const timezoneConfigurado = contextoEmpresa?.timezoneConfigurado ?? null

  const passos: DeliveryPassoChecklist[] = PASSOS_BASE.map(passo => {
    const tipos = TIPOS_POR_PASSO[passo.id]
    let concluido = !temPendenciaDoTipo(lista, tipos)

    if (passo.id === 'delivery-nome-cardapio' && !empresaConfigurada) {
      concluido = false
    }
    if (passo.id === 'delivery-design') {
      concluido = empresaConfigurada
    }
    if (passo.id === 'delivery-whatsapp') {
      const item = lista.find(
        p => p.type === EMPRESA_DELIVERY_PENDENCIA_TYPES.CANAL_WHATSAPP_NAO_CONECTADO
      )
      if (!item) {
        concluido = true
      } else {
        concluido = false
      }
    }

    // Sem loja delivery: agenda/cobertura não têm sinal confiável → incompletos.
    if (
      !empresaConfigurada &&
      (passo.id === 'delivery-agenda' || passo.id === 'delivery-cobertura')
    ) {
      concluido = false
    }

    // Fonte de verdade alinhada à aba Empresa (não depende só das pendências delivery).
    if (passo.id === 'delivery-geolocalizacao' && possuiGeolocalizacao !== null) {
      concluido = possuiGeolocalizacao
    }
    if (passo.id === 'delivery-timezone' && timezoneConfigurado !== null) {
      concluido = timezoneConfigurado
    }

    // Ajusta obrigatoriedade dinâmica pela API quando o tipo existe
    let obrigatoria = passo.obrigatoria
    const pendenciaRelacionada = lista.find(p => tipos.includes(p.type))
    if (pendenciaRelacionada) {
      obrigatoria = pendenciaEhObrigatoria(pendenciaRelacionada)
    }

    return { ...passo, obrigatoria, concluido }
  })

  // Se WhatsApp não aparece nas pendências, remove do checklist (não é passo conhecido)
  const passosVisiveis = passos.filter(passo => {
    if (passo.id !== 'delivery-whatsapp') return true
    return lista.some(
      p => p.type === EMPRESA_DELIVERY_PENDENCIA_TYPES.CANAL_WHATSAPP_NAO_CONECTADO
    )
  })

  const passosObrigatorios = passosVisiveis.filter(p => p.obrigatoria)
  const concluidosObrigatorios = passosObrigatorios.filter(p => p.concluido).length
  const totalObrigatorios = passosObrigatorios.length
  const porcentagemObrigatorias =
    totalObrigatorios === 0
      ? 100
      : Math.round((concluidosObrigatorios / totalObrigatorios) * 100)

  return {
    passos: passosVisiveis,
    passosObrigatorios,
    totalObrigatorios,
    concluidosObrigatorios,
    porcentagemObrigatorias,
  }
}

export function deliveryHubAbrirEtapaHref(etapaId: DeliveryEtapaId): string {
  return `${DELIVERY_HUB_PATH}?abrir=${encodeURIComponent(etapaId)}`
}
