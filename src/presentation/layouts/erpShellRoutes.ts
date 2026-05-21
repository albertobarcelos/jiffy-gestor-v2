/**
 * Inventário de rotas do shell ERP (Fase 0).
 * Route group `app/(erp)/` não altera URLs — apenas agrupa layout com TopNav único.
 */

/** Prefixos de pathname que usam ErpAppShell (TopNav + main). */
export const ERP_ROUTE_PREFIXES = [
  '/dashboard',
  '/produtos',
  '/grupos-produtos',
  '/grupos-complementos',
  '/complementos',
  '/taxas',
  '/usuarios',
  '/clientes',
  '/impressoras',
  '/perfis-usuarios-pdv',
  '/meios-pagamentos',
  '/estoque',
  '/meu-caixa',
  '/pedidos-clientes',
  '/vendas',
  '/relatorios',
  '/relatorios-vendas',
  '/relatorios-produtos-vendidos',
  '/painel-contador',
  '/historico-fechamento',
  '/configuracoes',
  '/cadastro-por-planilha',
  '/cadastros',
] as const

/** Rotas com navegação própria — fora do `(erp)`. */
export const NON_ERP_ROUTE_PREFIXES = [
  '/login',
  '/registro',
  '/confirmar-email',
  '/esqueci-senha',
  '/redefinir-senha',
  '/meus-apps',
  '/perfil',
  '/hub',
  '/convites-gestor',
  '/notas-fiscais',
] as const

export function isErpPathname(pathname: string | null): boolean {
  if (!pathname) return false
  return ERP_ROUTE_PREFIXES.some(
    prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

/** Rotas migradas para `app/(erp)/` (shell único ativo). */
export const ERP_SHELL_MIGRATED_PREFIXES = ERP_ROUTE_PREFIXES
