'use client'

import { ReactNode } from 'react'
import { usePermissions } from '@/src/presentation/hooks/usePermissions'
import type { PermissionType } from '@/src/shared/types/permissions'

interface PermissionGuardProps {
  /**
   * Permissão necessária para renderizar o conteúdo
   */
  permission: PermissionType
  
  /**
   * Conteúdo a ser renderizado se o usuário tiver a permissão
   */
  children: ReactNode
  
  /**
   * Conteúdo alternativo a ser renderizado se o usuário não tiver a permissão
   * Se não fornecido, nada será renderizado
   */
  fallback?: ReactNode
  
  /**
   * Se true, requer que o usuário tenha TODAS as permissões especificadas
   * Se false (padrão), requer apenas UMA das permissões
   */
  requireAll?: boolean
  
  /**
   * Lista adicional de permissões (para verificação múltipla)
   */
  additionalPermissions?: PermissionType[]
}

/**
 * Componente guard que protege conteúdo baseado em permissões
 * 
 * @example
 * ```tsx
 * <PermissionGuard permission="FINANCEIRO">
 *   <FinanceiroPanel />
 * </PermissionGuard>
 * 
 * <PermissionGuard 
 *   permission="DASHBOARD" 
 *   fallback={<div>Acesso negado</div>}
 * >
 *   <Dashboard />
 * </PermissionGuard>
 * ```
 */
export function PermissionGuard({
  permission,
  children,
  fallback = null,
  requireAll = false,
  additionalPermissions = [],
}: PermissionGuardProps) {
  const { hasAccess, hasAnyAccess, hasAllAccess } = usePermissions()

  // Se há permissões adicionais, usa verificação múltipla
  if (additionalPermissions.length > 0) {
    const allPermissions = [permission, ...additionalPermissions]
    
    if (requireAll) {
      return hasAllAccess(...allPermissions) ? <>{children}</> : <>{fallback}</>
    } else {
      return hasAnyAccess(...allPermissions) ? <>{children}</> : <>{fallback}</>
    }
  }

  // Verificação simples de uma permissão
  return hasAccess(permission) ? <>{children}</> : <>{fallback}</>
}
