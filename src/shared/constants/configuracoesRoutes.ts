import { stripGestaoEmpresaSlugFromPath } from '@/src/shared/utils/gestaoRoutes'

/** Segmentos de URL em `/configuracoes/:aba`. Delivery não entra aqui. */
export const CONFIGURACOES_TAB_SLUGS = [
  'empresa',
  'terminais',
  'impressoras',
  'meios-pagamentos',
  'taxas',
  'importar-dados',
] as const

export type ConfiguracoesTabSlug = (typeof CONFIGURACOES_TAB_SLUGS)[number]

/** Hub Delivery — path canônico. */
export const DELIVERY_HUB_PATH = '/config/delivery'

/** Aba Delivery no chrome de Configurações (a URL é só `DELIVERY_HUB_PATH`). */
export const CONFIGURACOES_DELIVERY_TAB = 'delivery' as const

export type ConfiguracoesViewTab = ConfiguracoesTabSlug | typeof CONFIGURACOES_DELIVERY_TAB

export type DeliveryEtapaId =
  | 'delivery-geolocalizacao'
  | 'delivery-cobertura'
  | 'delivery-entregadores'
  | 'delivery-meios'
  | 'delivery-impressoras'
  | 'delivery-notificacoes'

const DELIVERY_ETAPA_SLUG: Record<DeliveryEtapaId, string> = {
  'delivery-geolocalizacao': 'empresa',
  'delivery-cobertura': 'cobertura',
  'delivery-entregadores': 'entregadores',
  'delivery-meios': 'meios',
  'delivery-impressoras': 'impressoras',
  'delivery-notificacoes': 'notificacoes',
}

const DELIVERY_SLUG_TO_ETAPA = Object.fromEntries(
  Object.entries(DELIVERY_ETAPA_SLUG).map(([id, slug]) => [slug, id])
) as Record<string, DeliveryEtapaId>

export function isConfiguracoesTabSlug(value: string): value is ConfiguracoesTabSlug {
  return (CONFIGURACOES_TAB_SLUGS as readonly string[]).includes(value)
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

/** Path canônico da etapa (ex.: `/config/delivery/cobertura`). */
export function deliveryHubEtapaPath(etapaId: DeliveryEtapaId): string {
  return `${DELIVERY_HUB_PATH}/${deliveryEtapaSlug(etapaId)}`
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
