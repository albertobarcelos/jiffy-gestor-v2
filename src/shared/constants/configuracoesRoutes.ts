import { stripGestaoEmpresaSlugFromPath } from '@/src/shared/utils/gestaoRoutes'

/** Segmentos de URL em `/configuracoes/:aba` (exceto Delivery, que vive em `/config/delivery`). */
export const CONFIGURACOES_TAB_SLUGS = [
  'empresa',
  'empresa-delivery',
  'terminais',
  'impressoras',
  'meios-pagamentos',
  'taxas',
  'importar-dados',
] as const

export type ConfiguracoesTabSlug = (typeof CONFIGURACOES_TAB_SLUGS)[number]

/** Hub Delivery — path canônico. */
export const DELIVERY_HUB_PATH = '/config/delivery'

export type DeliveryEtapaId =
  | 'delivery-geolocalizacao'
  | 'delivery-cobertura'
  | 'delivery-entregadores'
  | 'delivery-meios'
  | 'delivery-impressoras'

const DELIVERY_ETAPA_SLUG: Record<DeliveryEtapaId, string> = {
  'delivery-geolocalizacao': 'empresa',
  'delivery-cobertura': 'cobertura',
  'delivery-entregadores': 'entregadores',
  'delivery-meios': 'meios',
  'delivery-impressoras': 'impressoras',
}

const DELIVERY_SLUG_TO_ETAPA = Object.fromEntries(
  Object.entries(DELIVERY_ETAPA_SLUG).map(([id, slug]) => [slug, id])
) as Record<string, DeliveryEtapaId>

const LEGACY_QUERY_TAB: Record<string, ConfiguracoesTabSlug> = {
  planilha: 'importar-dados',
  'cardapio-digital': 'empresa-delivery',
  'cobertura-delivery': 'empresa-delivery',
}

/** Slugs de rota antigos → aba de Configurações. */
const LEGACY_PATH_TAB: Record<string, ConfiguracoesTabSlug> = {
  'cardapio-digital': 'empresa-delivery',
  'cobertura-delivery': 'empresa-delivery',
}

export function isConfiguracoesTabSlug(value: string): value is ConfiguracoesTabSlug {
  return (CONFIGURACOES_TAB_SLUGS as readonly string[]).includes(value)
}

/** Resolve slug da URL, incluindo redirecionamento de rotas legadas. */
export function resolveConfiguracoesTabFromPath(
  value: string
): ConfiguracoesTabSlug | null {
  if (isConfiguracoesTabSlug(value)) return value
  return LEGACY_PATH_TAB[value] ?? null
}

/** Converte `?tab=` legado (ex.: `planilha`) para o slug canônico da rota. */
export function resolveConfiguracoesTabFromLegacyQuery(
  tab: string | null | undefined
): ConfiguracoesTabSlug {
  if (!tab) return 'empresa'
  const mapped = LEGACY_QUERY_TAB[tab]
  if (mapped) return mapped
  if (isConfiguracoesTabSlug(tab)) return tab
  return 'empresa'
}

export function configuracoesTabPath(tab: ConfiguracoesTabSlug): string {
  if (tab === 'empresa-delivery') return DELIVERY_HUB_PATH
  return `/configuracoes/${tab}`
}

export function deliveryEtapaSlug(etapaId: DeliveryEtapaId): string {
  return DELIVERY_ETAPA_SLUG[etapaId]
}

export function deliveryEtapaIdFromSlug(slug: string): DeliveryEtapaId | null {
  return DELIVERY_SLUG_TO_ETAPA[slug] ?? null
}

export function isDeliveryEtapaId(value: string): value is DeliveryEtapaId {
  return value in DELIVERY_ETAPA_SLUG
}

/** Path canônico da etapa (ex.: `/config/delivery/cobertura`). */
export function deliveryHubEtapaPath(etapaId: DeliveryEtapaId): string {
  return `${DELIVERY_HUB_PATH}/${deliveryEtapaSlug(etapaId)}`
}

/** Rotas antigas `/configuracoes/:aba` → hub ou etapa interna. */
export function resolverRedirectHubDeliveryLegado(
  aba: string,
  abrir: string | null | undefined
): string | null {
  if (aba === 'cobertura-delivery') {
    return deliveryHubEtapaPath('delivery-cobertura')
  }
  if (aba === 'empresa-delivery') {
    if (abrir && isDeliveryEtapaId(abrir)) {
      return deliveryHubEtapaPath(abrir)
    }
    return DELIVERY_HUB_PATH
  }
  return null
}

export function isConfiguracoesModulePath(pathname: string): boolean {
  const current = stripGestaoEmpresaSlugFromPath(pathname)
  return (
    current === '/configuracoes' ||
    current.startsWith('/configuracoes/') ||
    current === '/config' ||
    current.startsWith('/config/')
  )
}
