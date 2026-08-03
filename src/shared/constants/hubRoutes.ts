/**
 * Rotas canônicas do hub pós-login (Meu Jiffy / Minhas Empresas).
 * Usar estas constantes em vez de strings `/minhas-empresas` espalhadas.
 */

export const HUB_PATH = '/minhas-empresas'

export const HUB_ROUTES = {
  root: HUB_PATH,
  extratoFinanceiro: `${HUB_PATH}/extrato-financeiro`,
  treinamentos: `${HUB_PATH}/treinamentos`,
  gerenciarUsuarios: `${HUB_PATH}/gerenciar-usuarios`,
  perfisGestor: `${HUB_PATH}/perfis-gestor`,
} as const

export type HubEmpresaSubRoute =
  | typeof HUB_ROUTES.gerenciarUsuarios
  | typeof HUB_ROUTES.perfisGestor

export function isHubPathname(pathname: string | null | undefined): boolean {
  if (!pathname) return false
  return pathname === HUB_PATH || pathname.startsWith(`${HUB_PATH}/`)
}

export function hubPerfisGestorPath(slug?: string): string {
  return slug ? `${HUB_ROUTES.perfisGestor}/${slug}` : HUB_ROUTES.perfisGestor
}

export function hubGerenciarUsuariosPath(slug?: string): string {
  return slug ? `${HUB_ROUTES.gerenciarUsuarios}/${slug}` : HUB_ROUTES.gerenciarUsuarios
}
