import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from './validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'
import type { PermissionType } from '@/src/shared/types/permissions'
import { hasPermission, perfilGestorToPermissions } from '@/src/shared/types/permissions'

/**
 * Resultado da validação de permissão
 */
export interface PermissionValidationResult {
  valid: boolean
  error?: NextResponse
  permissions?: {
    acessoFinanceiro: boolean
    acessoEstoque: boolean
    acessoFiscal: boolean
    acessoDashboard: boolean
  }
}

/**
 * Carrega as permissões do usuário autenticado
 * 
 * @param request - Requisição Next.js
 * @returns Permissões do usuário ou null se não encontrado
 */
async function loadUserPermissions(request: NextRequest): Promise<{
  acessoFinanceiro: boolean
  acessoEstoque: boolean
  acessoFiscal: boolean
  acessoDashboard: boolean
} | null> {
  const validation = validateRequest(request)
  if (!validation.valid || !validation.tokenInfo) {
    return null
  }

  const { tokenInfo } = validation

  try {
    // 1. Buscar dados do usuário autenticado
    const apiClient = new ApiClient()
    const meResponse = await apiClient.request<any>('/api/v1/auth/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenInfo.token}`,
      },
    })

    const userId = meResponse.data?.sub || meResponse.data?.userId
    if (!userId) {
      return null
    }

    // 2. Buscar dados completos do usuário gestor
    const gestorResponse = await apiClient.request<any>(
      `/api/v1/pessoas/usuarios-gestor/${userId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenInfo.token}`,
        },
      }
    )

    // 3. Extrair permissões do perfil gestor
    const permissions = perfilGestorToPermissions(gestorResponse.data?.perfilGestor)
    return permissions
  } catch (error) {
    console.error('Erro ao carregar permissões do usuário:', error)
    return null
  }
}

/**
 * Valida se o usuário tem uma permissão específica
 * 
 * @param request - Requisição Next.js
 * @param permission - Permissão necessária
 * @returns Resultado da validação
 * 
 * @example
 * ```ts
 * const validation = await validatePermission(request, 'FINANCEIRO')
 * if (!validation.valid) {
 *   return validation.error
 * }
 * ```
 */
export async function validatePermission(
  request: NextRequest,
  permission: PermissionType
): Promise<PermissionValidationResult> {
  // Primeiro valida o token
  const tokenValidation = validateRequest(request)
  if (!tokenValidation.valid || !tokenValidation.tokenInfo) {
    return {
      valid: false,
      error: tokenValidation.error!,
    }
  }

  // Carrega permissões do usuário
  const permissions = await loadUserPermissions(request)
  if (!permissions) {
    return {
      valid: false,
      error: NextResponse.json(
        { message: 'Permissões do usuário não encontradas' },
        { status: 403 }
      ),
    }
  }

  // Verifica se o usuário tem a permissão necessária
  if (!hasPermission(permissions, permission)) {
    return {
      valid: false,
      error: NextResponse.json(
        { 
          message: `Acesso negado. Permissão necessária: ${permission}`,
          requiredPermission: permission,
        },
        { status: 403 }
      ),
    }
  }

  return {
    valid: true,
    permissions,
  }
}

/**
 * Valida se o usuário tem pelo menos uma das permissões especificadas
 * 
 * @param request - Requisição Next.js
 * @param permissions - Lista de permissões (pelo menos uma é necessária)
 * @returns Resultado da validação
 */
export async function validateAnyPermission(
  request: NextRequest,
  ...permissions: PermissionType[]
): Promise<PermissionValidationResult> {
  const tokenValidation = validateRequest(request)
  if (!tokenValidation.valid || !tokenValidation.tokenInfo) {
    return {
      valid: false,
      error: tokenValidation.error!,
    }
  }

  const userPermissions = await loadUserPermissions(request)
  if (!userPermissions) {
    return {
      valid: false,
      error: NextResponse.json(
        { message: 'Permissões do usuário não encontradas' },
        { status: 403 }
      ),
    }
  }

  // Verifica se o usuário tem pelo menos uma das permissões
  const hasAny = permissions.some(permission => hasPermission(userPermissions, permission))
  
  if (!hasAny) {
    return {
      valid: false,
      error: NextResponse.json(
        { 
          message: `Acesso negado. Uma das permissões é necessária: ${permissions.join(', ')}`,
          requiredPermissions: permissions,
        },
        { status: 403 }
      ),
    }
  }

  return {
    valid: true,
    permissions: userPermissions,
  }
}
