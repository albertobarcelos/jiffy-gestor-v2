import { NextRequest, NextResponse } from 'next/server'
import { ApiClient } from '@/src/infrastructure/api/apiClient'
import type { LoginEmpresaSnapshot } from '@/src/domain/types/LoginEmpresaSnapshot'
import {
  applyRefreshTokenMap,
  readRefreshTokenMap,
} from '@/src/shared/utils/refreshTokenMap'
import { AUTH_COOKIE_TENANT, cookieOptsMaxAge } from '@/src/shared/utils/authCookies'
import { decodeToken, extractTokenInfo } from '@/src/shared/utils/validateToken'
import { getTokenInfo } from '@/src/shared/utils/getTokenInfo'

function mapEmpresaPayload(payload: unknown): LoginEmpresaSnapshot | null {
  if (!payload || typeof payload !== 'object') return null
  const p = payload as Record<string, unknown>
  const id = p.id != null ? String(p.id).trim() : ''
  const nomeFantasia =
    (typeof p.nomeFantasia === 'string' && p.nomeFantasia.trim()) ||
    (typeof p.nome === 'string' && p.nome.trim()) ||
    (typeof p.razaoSocial === 'string' && p.razaoSocial.trim()) ||
    ''
  const cnpj =
    (typeof p.cnpj === 'string' && p.cnpj.trim()) ||
    (typeof p.documento === 'string' && p.documento.trim()) ||
    ''
  if (!id || !nomeFantasia || !cnpj) return null
  const bloqueado = typeof p.bloqueado === 'boolean' ? p.bloqueado : false
  return { id, nomeFantasia, cnpj, bloqueado }
}

async function fetchEmpresaMe(
  apiClient: ApiClient,
  accessToken: string
): Promise<LoginEmpresaSnapshot | null> {
  try {
    const response = await apiClient.request<unknown>('/api/v1/empresas/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    return mapEmpresaPayload(response.data)
  } catch {
    return null
  }
}

async function mintAccessForEmpresa(
  apiClient: ApiClient,
  refreshToken: string,
  expectedEmpresaId: string
): Promise<string | null> {
  try {
    const response = await apiClient.request<{ accessToken?: string }>(
      '/api/v1/auth/refresh-token',
      {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }
    )
    const accessToken = response.data?.accessToken
    if (typeof accessToken !== 'string' || !accessToken) return null
    const { empresaId } = extractTokenInfo(accessToken)
    if (empresaId && empresaId !== expectedEmpresaId) return null
    return accessToken
  } catch {
    return null
  }
}

/**
 * GET /api/auth/hub-empresas
 * Recupera snapshots das empresas do hub a partir do mapa de refresh (e do Bearer atual).
 * Usado quando `hubEmpresas` no client foi perdido sem novo login.
 */
export async function GET(request: NextRequest) {
  try {
    const apiClient = new ApiClient()
    const map = readRefreshTokenMap(request)
    const empresaIds = new Set<string>(Object.keys(map))

    const bearerInfo = getTokenInfo(request)
    if (bearerInfo?.empresaId) {
      empresaIds.add(bearerInfo.empresaId)
    }

    if (empresaIds.size === 0) {
      return NextResponse.json({ empresas: [] as LoginEmpresaSnapshot[] })
    }

    const empresas: LoginEmpresaSnapshot[] = []
    const seen = new Set<string>()
    let lastAccess: string | null = null
    let lastEmpresaId: string | null = null

    // Bearer atual (access) — 1 chamada rápida
    if (bearerInfo?.token && bearerInfo.empresaId) {
      const snap = await fetchEmpresaMe(apiClient, bearerInfo.token)
      if (snap && !seen.has(snap.id)) {
        seen.add(snap.id)
        empresas.push(snap)
        lastAccess = bearerInfo.token
        lastEmpresaId = snap.id
      }
    }

    for (const empresaId of empresaIds) {
      if (seen.has(empresaId)) continue
      const refreshToken = map[empresaId]
      if (!refreshToken) continue

      const accessToken = await mintAccessForEmpresa(apiClient, refreshToken, empresaId)
      if (!accessToken) continue

      const snap = await fetchEmpresaMe(apiClient, accessToken)
      if (!snap || seen.has(snap.id)) continue

      seen.add(snap.id)
      empresas.push(snap)
      lastAccess = accessToken
      lastEmpresaId = snap.id
    }

    const res = NextResponse.json({ empresas })

    // Mantém cookie tenant alinhado à última empresa resolvida (ponte do hub).
    if (lastAccess && lastEmpresaId) {
      const decoded = decodeToken(lastAccess)
      const maxAge = decoded?.exp
        ? Math.max(decoded.exp - Math.floor(Date.now() / 1000), 60)
        : 60 * 60 * 24
      res.cookies.set(AUTH_COOKIE_TENANT, lastAccess, cookieOptsMaxAge(maxAge))
      const refreshForLast = map[lastEmpresaId]
      if (refreshForLast) {
        applyRefreshTokenMap(res, map, lastEmpresaId, refreshForLast, 60 * 60 * 24 * 7)
      }
    }

    return res
  } catch (e) {
    console.error('[hub-empresas]', e)
    return NextResponse.json(
      { error: 'Não foi possível recuperar as empresas do hub' },
      { status: 500 }
    )
  }
}
