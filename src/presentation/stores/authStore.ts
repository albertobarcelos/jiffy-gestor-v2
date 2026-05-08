'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { Auth } from '@/src/domain/entities/Auth'
import { User } from '@/src/domain/entities/User'
import type { LoginEmpresaSnapshot } from '@/src/domain/types/LoginEmpresaSnapshot'

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
  hubEmpresas: LoginEmpresaSnapshot[] | null
  isAuthenticated: boolean
  isLoading: boolean
  isRehydrated: boolean
  error: string | null
  login: (auth: Auth) => void
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

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      identityAuth: null,
      tenantAuth: null,
      auth: null,
      hubEmpresas: null,
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
        set({ hubEmpresas: empresas })
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

        set({
          identityAuth: null,
          tenantAuth: null,
          auth: null,
          hubEmpresas: null,
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
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({
        identityAuth: state.identityAuth ? (state.identityAuth.toJSON() as PersistedAuthJSON) : null,
        tenantAuth: state.tenantAuth ? (state.tenantAuth.toJSON() as PersistedAuthJSON) : null,
        hubEmpresas: state.hubEmpresas,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => state => {
        if (!state) {
          return
        }
        const s = state as AuthState & { auth?: unknown }

        let identityAuth = authFromJson(asPersistedAuthJson(s.identityAuth))
        let tenantAuth = authFromJson(asPersistedAuthJson(s.tenantAuth))

        if (!identityAuth && !tenantAuth && s.auth !== undefined) {
          identityAuth = authFromJson(asPersistedAuthJson(s.auth))
        }

        s.identityAuth = identityAuth
        s.tenantAuth = tenantAuth
        s.auth = tenantAuth ?? identityAuth ?? null
        s.isAuthenticated = !!(identityAuth || tenantAuth)
        s.isRehydrated = true
      },
    }
  )
)
