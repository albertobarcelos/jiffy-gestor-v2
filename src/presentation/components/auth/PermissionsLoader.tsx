'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'

/**
 * Componente que carrega as permissões do usuário automaticamente
 * Deve ser usado no layout principal da aplicação
 * 
 * @example
 * ```tsx
 * <PermissionsLoader />
 * ```
 */
export function PermissionsLoader() {
  const { isAuthenticated, permissions, loadPermissions } = useAuthStore()

  useEffect(() => {
    // Carrega permissões se o usuário estiver autenticado e as permissões ainda não foram carregadas
    if (isAuthenticated && !permissions) {
      loadPermissions()
    }
  }, [isAuthenticated, permissions, loadPermissions])

  // Componente não renderiza nada
  return null
}
