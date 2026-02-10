'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePermissions } from '@/src/presentation/hooks/usePermissions'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import type { PermissionType } from '@/src/shared/types/permissions'

interface UseRequirePermissionOptions {
  /**
   * Permissão necessária para acessar a página
   */
  permission: PermissionType
  
  /**
   * Rota para redirecionar se o usuário não tiver a permissão
   * Padrão: '/dashboard'
   */
  redirectTo?: string
  
  /**
   * Se true, requer que o usuário tenha TODAS as permissões especificadas
   */
  requireAll?: boolean
  
  /**
   * Permissões adicionais para verificação múltipla
   */
  additionalPermissions?: PermissionType[]
}

/**
 * Hook para proteger páginas baseado em permissões
 * Redireciona automaticamente se o usuário não tiver a permissão necessária
 * 
 * @example
 * ```tsx
 * export default function FinanceiroPage() {
 *   useRequirePermission({ permission: 'FINANCEIRO' })
 *   
 *   return <div>Conteúdo financeiro</div>
 * }
 * ```
 */
export function useRequirePermission({
  permission,
  redirectTo = '/dashboard',
  requireAll = false,
  additionalPermissions = [],
}: UseRequirePermissionOptions) {
  const router = useRouter()
  const { hasAccess, hasAnyAccess, hasAllAccess, permissions } = usePermissions()
  const { isAuthenticated, loadPermissions } = useAuthStore()

  useEffect(() => {
    // Se está autenticado mas permissões ainda não foram carregadas, tenta carregar
    if (isAuthenticated && !permissions) {
      loadPermissions()
      // Aguarda um pouco para as permissões serem carregadas antes de verificar
      return
    }

    // Se permissões ainda não foram carregadas, não redireciona ainda
    if (!permissions) {
      return
    }

    let hasPermission = false

    if (additionalPermissions.length > 0) {
      const allPermissions = [permission, ...additionalPermissions]
      hasPermission = requireAll
        ? hasAllAccess(...allPermissions)
        : hasAnyAccess(...allPermissions)
    } else {
      hasPermission = hasAccess(permission)
    }

    if (!hasPermission) {
      router.push(redirectTo)
    }
  }, [permission, redirectTo, requireAll, additionalPermissions, hasAccess, hasAnyAccess, hasAllAccess, router, permissions, isAuthenticated, loadPermissions])
}
