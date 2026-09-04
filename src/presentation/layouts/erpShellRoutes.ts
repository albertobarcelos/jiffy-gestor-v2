/**
 * Inventário de rotas do shell ERP (Fase 2).
 * Route group `app/(erp)/` não altera URLs — apenas agrupa layout com TopNav único.
 */

import { HUB_PATH } from '@/src/shared/constants/hubRoutes'

/** Prefixos de pathname que usam ErpAppShell (TopNav + main). */
export const ERP_ROUTE_PREFIXES = [
  '/dashboard',
  '/menus',
  '/produtos',
  '/grupos-produtos',
  '/grupos-complementos',
  '/complementos',
  '/taxas',
  '/usuarios',
  '/entregadores',
  '/clientes',
  '/impressoras',
  '/perfis-usuarios-pdv',
  '/meios-pagamentos',
  '/estoque',
  '/meu-caixa',
  '/pedidos',
  '/vendas',
  '/relatorios',
  '/relatorios-vendas',
  '/relatorios-produtos-vendidos',
  '/painel-contador',
  '/historico-fechamento',
  '/configuracoes',
  '/cadastro-por-planilha',
] as const

/** Rotas com navegação própria — fora do `(erp)`. Hub usa `(hub)` com `HubAppShell`. */
export const NON_ERP_ROUTE_PREFIXES = [
  '/login',
  '/registro',
  '/confirmar-email',
  '/esqueci-senha',
  '/redefinir-senha',
  HUB_PATH,
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
