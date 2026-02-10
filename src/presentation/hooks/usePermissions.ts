'use client'

import { useMemo } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import type { UserPermissions, PermissionType } from '@/src/shared/types/permissions'
import { hasPermission, hasAnyPermission, hasAllPermissions } from '@/src/shared/types/permissions'

/**
 * Hook para gerenciar e verificar permissões do usuário autenticado
 * 
 * @example
 * ```tsx
 * const { permissions, hasAccess, hasAnyAccess, hasAllAccess } = usePermissions()
 * 
 * if (hasAccess('FINANCEIRO')) {
 *   // Renderizar componente financeiro
 * }
 * ```
 */
export function usePermissions() {
  const { permissions } = useAuthStore()

  /**
   * Verifica se o usuário tem uma permissão específica
   */
  const hasAccess = useMemo(
    () => (permission: PermissionType) => hasPermission(permissions, permission),
    [permissions]
  )

  /**
   * Verifica se o usuário tem pelo menos uma das permissões especificadas
   */
  const hasAnyAccess = useMemo(
    () => (...permissionList: PermissionType[]) => 
      hasAnyPermission(permissions, ...permissionList),
    [permissions]
  )

  /**
   * Verifica se o usuário tem todas as permissões especificadas
   */
  const hasAllAccess = useMemo(
    () => (...permissionList: PermissionType[]) => 
      hasAllPermissions(permissions, ...permissionList),
    [permissions]
  )

  /**
   * Verifica se o usuário tem alguma permissão (está autenticado com permissões)
   */
  const hasAnyPermissionAtAll = useMemo(
    () => permissions !== null && (
      permissions.acessoFinanceiro ||
      permissions.acessoEstoque ||
      permissions.acessoFiscal ||
      permissions.acessoDashboard
    ),
    [permissions]
  )

  return {
    permissions,
    hasAccess,
    hasAnyAccess,
    hasAllAccess,
    hasAnyPermission: hasAnyPermissionAtAll,
  }
}
