/**
 * Tipos e constantes para o sistema de permissões
 * 
 * Este arquivo centraliza todas as definições de permissões do sistema.
 * Para adicionar novas permissões, basta adicionar aqui e atualizar os tipos relacionados.
 */

/**
 * Tipos de permissões disponíveis no sistema
 * Cada permissão corresponde a um módulo/funcionalidade específica
 */
export type PermissionType = 
  | 'FINANCEIRO'
  | 'ESTOQUE'
  | 'FISCAL'
  | 'DASHBOARD'

/**
 * Mapeamento de permissões para suas descrições
 * Útil para exibição em interfaces e logs
 */
export const PERMISSION_LABELS: Record<PermissionType, string> = {
  FINANCEIRO: 'Financeiro',
  ESTOQUE: 'Estoque',
  FISCAL: 'Fiscal',
  DASHBOARD: 'Dashboard',
}

/**
 * Mapeamento de permissões para rotas relacionadas
 * Usado para proteger rotas baseado em permissões
 */
export const PERMISSION_ROUTES: Record<PermissionType, string[]> = {
  FINANCEIRO: [
    '/financeiro',
    '/relatorios', // Relatórios financeiros
    '/painel-contador',
  ],
  ESTOQUE: [
    '/estoque',
    '/cadastros/produtos',
    '/cadastros/grupos-produtos',
  ],
  FISCAL: [
    '/fiscal',
    '/nf-e',
    '/nfe',
  ],
  DASHBOARD: [
    '/dashboard',
  ],
}

/**
 * Interface para representar as permissões de um usuário
 */
export interface UserPermissions {
  acessoFinanceiro: boolean
  acessoEstoque: boolean
  acessoFiscal: boolean
  acessoDashboard: boolean
}

/**
 * Função auxiliar para verificar se uma permissão específica está ativa
 */
export function hasPermission(
  permissions: UserPermissions | null | undefined,
  permission: PermissionType
): boolean {
  if (!permissions) return false

  switch (permission) {
    case 'FINANCEIRO':
      return permissions.acessoFinanceiro
    case 'ESTOQUE':
      return permissions.acessoEstoque
    case 'FISCAL':
      return permissions.acessoFiscal
    case 'DASHBOARD':
      return permissions.acessoDashboard
    default:
      return false
  }
}

/**
 * Função auxiliar para verificar se o usuário tem pelo menos uma das permissões
 */
export function hasAnyPermission(
  permissions: UserPermissions | null | undefined,
  ...permissionList: PermissionType[]
): boolean {
  if (!permissions) return false
  return permissionList.some(permission => hasPermission(permissions, permission))
}

/**
 * Função auxiliar para verificar se o usuário tem todas as permissões especificadas
 */
export function hasAllPermissions(
  permissions: UserPermissions | null | undefined,
  ...permissionList: PermissionType[]
): boolean {
  if (!permissions) return false
  return permissionList.every(permission => hasPermission(permissions, permission))
}

/**
 * Converte um objeto PerfilGestor para UserPermissions
 */
export function perfilGestorToPermissions(perfilGestor: {
  acessoFinanceiro?: boolean
  acessoEstoque?: boolean
  acessoFiscal?: boolean
  acessoDashboard?: boolean
} | null | undefined): UserPermissions | null {
  if (!perfilGestor) return null

  return {
    acessoFinanceiro: perfilGestor.acessoFinanceiro ?? false,
    acessoEstoque: perfilGestor.acessoEstoque ?? false,
    acessoFiscal: perfilGestor.acessoFiscal ?? false,
    acessoDashboard: perfilGestor.acessoDashboard ?? false,
  }
}
