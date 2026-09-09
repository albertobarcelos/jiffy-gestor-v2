import { stripGestaoEmpresaSlugFromPath } from '@/src/shared/utils/gestaoRoutes'

/** Segmentos de URL em `/configuracoes/:aba`. */
export const CONFIGURACOES_TAB_SLUGS = [
  'empresa',
  'empresa-delivery',
  'terminais',
  'impressoras',
  'meios-pagamentos',
  'taxas',
  'menus',
  'importar-dados',
] as const

export type ConfiguracoesTabSlug = (typeof CONFIGURACOES_TAB_SLUGS)[number]

/** Alias quando a URL é `/config/delivery` (páginas herdadas da main). */
export const CONFIGURACOES_DELIVERY_TAB = 'delivery' as const

export type ConfiguracoesViewTab = ConfiguracoesTabSlug | typeof CONFIGURACOES_DELIVERY_TAB

const LEGACY_QUERY_TAB: Record<string, ConfiguracoesTabSlug> = {
  planilha: 'importar-dados',
  'cardapio-digital': 'empresa-delivery',
  'cobertura-delivery': 'empresa-delivery',
}

const LEGACY_PATH_TAB: Record<string, ConfiguracoesTabSlug> = {
  'cardapio-digital': 'empresa-delivery',
  'cobertura-delivery': 'empresa-delivery',
}

/** Hub canônico nesta branch: cardápio + cobertura. */
export const DELIVERY_HUB_PATH = '/configuracoes/empresa-delivery'

/** Path da main; as páginas em `app/(erp)/config/delivery` continuam válidas. */
export const DELIVERY_CONFIG_PATH = '/config/delivery'

export type DeliveryEtapaId =
  | 'delivery-nome-cardapio'
  | 'delivery-design'
  | 'delivery-agenda'
  | 'delivery-cobertura'
  | 'delivery-notificacoes'
  | 'delivery-geolocalizacao'
  | 'delivery-entregadores'
  | 'delivery-meios'
  | 'delivery-impressoras'

const DELIVERY_ETAPA_SLUG: Record<DeliveryEtapaId, string> = {
  'delivery-nome-cardapio': 'nome-cardapio',
  'delivery-design': 'design',
  'delivery-agenda': 'agenda',
  'delivery-cobertura': 'cobertura',
  'delivery-notificacoes': 'notificacoes',
  'delivery-geolocalizacao': 'empresa',
  'delivery-entregadores': 'entregadores',
  'delivery-meios': 'meios',
  'delivery-impressoras': 'impressoras',
}

const DELIVERY_SLUG_TO_ETAPA = Object.fromEntries(
  Object.entries(DELIVERY_ETAPA_SLUG).map(([id, slug]) => [slug, id])
) as Record<string, DeliveryEtapaId>

const ETAPAS_HUB_QUERY: ReadonlySet<DeliveryEtapaId> = new Set([
  'delivery-nome-cardapio',
  'delivery-design',
  'delivery-agenda',
  'delivery-cobertura',
  'delivery-notificacoes',
])

export function isConfiguracoesTabSlug(value: string): value is ConfiguracoesTabSlug {
  return (CONFIGURACOES_TAB_SLUGS as readonly string[]).includes(value)
}

export function resolveConfiguracoesTabFromPath(value: string): ConfiguracoesTabSlug | null {
  if (isConfiguracoesTabSlug(value)) return value
  return LEGACY_PATH_TAB[value] ?? null
}

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

/** Deep-link no hub (`?abrir=`) ou path `/config/delivery/:etapa`. */
export function deliveryHubEtapaPath(etapaId: DeliveryEtapaId): string {
  if (ETAPAS_HUB_QUERY.has(etapaId)) {
    return `${DELIVERY_HUB_PATH}?abrir=${encodeURIComponent(etapaId)}`
  }
  return `${DELIVERY_CONFIG_PATH}/${deliveryEtapaSlug(etapaId)}`
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
