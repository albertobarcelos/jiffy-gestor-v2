/** Segmentos de URL em `/configuracoes/:aba` */
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

const LEGACY_QUERY_TAB: Record<string, ConfiguracoesTabSlug> = {
  planilha: 'importar-dados',
  'cardapio-digital': 'empresa-delivery',
}

/** Slugs de rota antigos → slug canônico (`/configuracoes/:aba`). */
const LEGACY_PATH_TAB: Record<string, ConfiguracoesTabSlug> = {
  'cardapio-digital': 'empresa-delivery',
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
  return `/configuracoes/${tab}`
}
