'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { Auth } from '@/src/domain/entities/Auth'
import { User } from '@/src/domain/entities/User'
import type { LoginEmpresaSnapshot } from '@/src/domain/types/LoginEmpresaSnapshot'
import { buildAuthFromAccessToken } from '@/src/shared/utils/buildAuthFromAccessToken'
import { SESSION_STORAGE_TENANT_TOKEN } from '@/src/shared/constants/sessionCoordinator'
import { clearTabSession } from '@/src/shared/utils/tabSession'

/**
 * Referência ao `set` do Zustand capturada na factory.
 * Usada em `onRehydrateStorage` para setar `isRehydrated = true` quando o estado
 * reidratado é `null` (localStorage vazio, corrompido ou primeira visita).
 * É seguro porque a callback de reidratação só é invocada após a inicialização
 * do módulo, quando `_storeSet` já está preenchido.
 */
let _storeSet: ((partial: Partial<AuthState>) => void) | null = null

type PersistedAuthJSON = {
  accessToken: string
  user: {
    id: string
    email: string
    name?: string
  }
  expiresAt: string
}

interface AuthState {
  /** JWT do login (hub / identidade). Não é substituído ao escolher empresa. */
  identityAuth: Auth | null
  /** JWT após POST escolher-empresa (tenant). */
  tenantAuth: Auth | null
  /**
   * Compat: sessão “ativa” para o ERP = tenant se existir, senão identidade.
   * Hub (Meus Apps) deve usar sempre `identityAuth` nos fetches.
   */
  auth: Auth | null
  /** Lista do hub — persistida com `hubEmpresasUserId` (validada contra a identidade). */
  hubEmpresas: LoginEmpresaSnapshot[] | null
  /** Dono da lista `hubEmpresas` — deve coincidir com `identityAuth.user.id`. */
  hubEmpresasUserId: string | null
  isAuthenticated: boolean
  isLoading: boolean
  isRehydrated: boolean
  error: string | null
  login: (auth: Auth) => void
  /** Login hub + empresas num único `set` (evita race no persist cross-tab). */
  loginWithHubEmpresas: (auth: Auth, empresas: LoginEmpresaSnapshot[] | null) => void
  setTenantAuth: (tenant: Auth | null) => void
  setHubEmpresas: (empresas: LoginEmpresaSnapshot[] | null) => void
  /** Logout só do hub (Meus Apps); mantém sessão da empresa. */
  logoutHub: () => Promise<void>
  /** Logout só da empresa; mantém identidade no hub. */
  logoutTenant: () => Promise<void>
  /** Logout completo (identidade + tenant). */
  logout: () => Promise<void>
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  getUser: () => User | null
  /** Atualiza o nome em memória (identity + tenant) após PATCH `/usuarios/me` — o JWT não muda. */
  updateSessionUserDisplayName: (name: string) => void
}

function authFromJson(data: PersistedAuthJSON | null | undefined): Auth | null {
  if (!data?.accessToken) {
    return null
  }
  const user = User.create(data.user.id, data.user.email, data.user.name)
  const expiresAt = new Date(data.expiresAt)
  return Auth.createWithExpiration(data.accessToken, user, expiresAt)
}

function asPersistedAuthJson(raw: unknown): PersistedAuthJSON | null {
  if (raw === null || raw === undefined || typeof raw !== 'object') {
    return null
  }
  const o = raw as Record<string, unknown>
  if (typeof o.accessToken !== 'string' || typeof o.expiresAt !== 'string') {
    return null
  }
  const u = o.user
  if (!u || typeof u !== 'object') {
    return null
  }
  const user = u as Record<string, unknown>
  if (typeof user.id !== 'string' || typeof user.email !== 'string') {
    return null
  }
  return {
    accessToken: o.accessToken,
    expiresAt: o.expiresAt,
    user: {
      id: user.id,
      email: user.email,
      name: typeof user.name === 'string' ? user.name : undefined,
    },
  }
}

/**
 * Descarta empresas do hub se `hubEmpresasUserId` não bater com o JWT de identidade.
 */
export function sanitizeHubEmpresasForIdentity(
  identityAuth: Auth | null,
  hubEmpresas: LoginEmpresaSnapshot[] | null,
  hubEmpresasUserId: string | null | undefined
): { hubEmpresas: LoginEmpresaSnapshot[] | null; hubEmpresasUserId: string | null } {
  if (!identityAuth || !hubEmpresas?.length) {
    return { hubEmpresas: null, hubEmpresasUserId: null }
  }

  const identityUserId = identityAuth.getUser().getId()
  if (!hubEmpresasUserId || hubEmpresasUserId !== identityUserId) {
    return { hubEmpresas: null, hubEmpresasUserId: null }
  }

  return { hubEmpresas, hubEmpresasUserId }
}

function restoreTenantFromSessionStorage(identityAuth: Auth | null): Auth | null {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const token = sessionStorage.getItem(SESSION_STORAGE_TENANT_TOKEN)
    if (!token) return null
    const prev = identityAuth?.getUser()
    return buildAuthFromAccessToken(
      token,
      prev ? { id: prev.getId(), email: prev.getEmail(), name: prev.getName() } : undefined
    )
  } catch {
    return null
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => {
      _storeSet = set
      return {
      identityAuth: null,
      tenantAuth: null,
      auth: null,
      hubEmpresas: null,
      hubEmpresasUserId: null,
      isAuthenticated: false,
      isLoading: false,
      isRehydrated: false,
      error: null,

      login: (authSession: Auth) => {
        if (authSession.isExpired()) {
          set({ error: 'Sessão expirada. Faça login novamente.' })
          return
        }

        set({
          identityAuth: authSession,
          tenantAuth: null,
          auth: authSession,
          hubEmpresas: null,
          hubEmpresasUserId: null,
          isAuthenticated: true,
          error: null,
        })
      },

      loginWithHubEmpresas: (authSession: Auth, empresas: LoginEmpresaSnapshot[] | null) => {
        if (authSession.isExpired()) {
          set({ error: 'Sessão expirada. Faça login novamente.' })
          return
        }

        const userId = authSession.getUser().getId()
        set({
          identityAuth: authSession,
          tenantAuth: null,
          auth: authSession,
          hubEmpresas: empresas,
          hubEmpresasUserId: userId,
          isAuthenticated: true,
          error: null,
        })
      },

      setTenantAuth: (tenant: Auth | null) => {
        set(state => ({
          tenantAuth: tenant,
          auth: tenant ?? state.identityAuth,
          isAuthenticated: !!(tenant ?? state.identityAuth),
        }))
      },

      setHubEmpresas: (empresas: LoginEmpresaSnapshot[] | null) => {
        const userId = get().identityAuth?.getUser().getId() ?? null
        set({
          hubEmpresas: empresas,
          hubEmpresasUserId: empresas === null || empresas.length === 0 ? null : userId,
        })
      },

      logoutHub: async () => {
        try {
          await fetch('/api/auth/logout-hub', {
            method: 'POST',
            credentials: 'include',
          })
        } catch (error) {
          console.error('Erro ao chamar API logout-hub:', error)
        }

        set(state => ({
          identityAuth: null,
          hubEmpresas: null,
          hubEmpresasUserId: null,
          auth: state.tenantAuth ?? null,
          isAuthenticated: !!state.tenantAuth,
          error: null,
        }))
      },

      logoutTenant: async () => {
        try {
          await fetch('/api/auth/logout-tenant', {
            method: 'POST',
            credentials: 'include',
          })
        } catch (error) {
          console.error('Erro ao chamar API logout-tenant:', error)
        }
        clearTabSession()

        set(state => ({
          tenantAuth: null,
          auth: state.identityAuth ?? null,
          isAuthenticated: !!state.identityAuth,
          error: null,
        }))
      },

      logout: async () => {
        try {
          await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include',
          })
        } catch (error) {
          console.error('Erro ao chamar API de logout:', error)
        }

        clearTabSession()

        set({
          identityAuth: null,
          tenantAuth: null,
          auth: null,
          hubEmpresas: null,
          hubEmpresasUserId: null,
          isAuthenticated: false,
          error: null,
        })

        try {
          localStorage.removeItem('auth-storage')
          localStorage.removeItem('tabs-storage')
        } catch (error) {
          console.error('Erro ao limpar localStorage:', error)
        }
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },

      setError: (error: string | null) => {
        set({ error })
      },

      getUser: () => {
        const { identityAuth, tenantAuth } = get()
        return identityAuth?.getUser() ?? tenantAuth?.getUser() ?? null
      },

      updateSessionUserDisplayName: (name: string) => {
        const trimmed = name.trim()
        const displayName = trimmed.length > 0 ? trimmed : undefined
        set(state => {
          const patchAuth = (a: Auth | null): Auth | null => {
            if (!a) return null
            const u = a.getUser()
            const newUser = User.create(u.getId(), u.getEmail(), displayName)
            return Auth.createWithExpiration(a.getAccessToken(), newUser, a.getExpiresAt())
          }
          const identityAuth = patchAuth(state.identityAuth)
          const tenantAuth = patchAuth(state.tenantAuth)
          return {
            identityAuth,
            tenantAuth,
            auth: tenantAuth ?? identityAuth ?? null,
          }
        })
      },
    }
    },
    {
      name: 'auth-storage',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({
        identityAuth: state.identityAuth ? (state.identityAuth.toJSON() as PersistedAuthJSON) : null,
        hubEmpresas: state.hubEmpresas,
        hubEmpresasUserId: state.hubEmpresasUserId,
        isAuthenticated: state.isAuthenticated,
      }),
      migrate: (persistedState, version) => {
        if (!persistedState || typeof persistedState !== 'object') {
          return persistedState
        }
        const st = { ...(persistedState as Record<string, unknown>) }

        if (version < 1) {
          delete st.hubEmpresas
          delete st.hubEmpresasUserId
        }

        if (version < 2 && st.hubEmpresas && !st.hubEmpresasUserId) {
          delete st.hubEmpresas
        }

        return st as typeof persistedState
      },
      onRehydrateStorage: () => state => {
        if (!state) {
          // localStorage vazio (primeira visita) ou corrompido.
          // Limpar storage inválido e marcar reidratação como concluída para
          // não travar a aplicação em loading infinito.
          try { localStorage.removeItem('auth-storage') } catch { /* noop */ }
          _storeSet?.({ isRehydrated: true })
          return
        }
        const s = state as AuthState & { auth?: unknown }

        let identityAuth = authFromJson(asPersistedAuthJson(s.identityAuth))

        if (!identityAuth && s.auth !== undefined) {
          identityAuth = authFromJson(asPersistedAuthJson(s.auth))
        }

        const tenantAuth = restoreTenantFromSessionStorage(identityAuth)

        const sanitized = sanitizeHubEmpresasForIdentity(
          identityAuth,
          s.hubEmpresas,
          s.hubEmpresasUserId
        )

        s.identityAuth = identityAuth
        s.tenantAuth = tenantAuth
        s.auth = tenantAuth ?? identityAuth ?? null
        s.hubEmpresas = sanitized.hubEmpresas
        s.hubEmpresasUserId = sanitized.hubEmpresasUserId
        s.isAuthenticated = !!(identityAuth || tenantAuth)
        s.isRehydrated = true
      },
    }
  )
)
