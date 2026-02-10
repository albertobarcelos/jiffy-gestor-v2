'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { Auth } from '@/src/domain/entities/Auth'
import { User } from '@/src/domain/entities/User'
import type { UserPermissions } from '@/src/shared/types/permissions'
import { perfilGestorToPermissions } from '@/src/shared/types/permissions'

interface AuthState {
  auth: Auth | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  permissions: UserPermissions | null
  login: (auth: Auth) => void
  logout: () => Promise<void>
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  getUser: () => User | null
  setPermissions: (permissions: UserPermissions | null) => void
  loadPermissions: () => Promise<void>
}

interface AuthStorage {
  auth: {
    accessToken: string
    user: {
      id: string
      email: string
      name?: string
    }
    expiresAt: string
  } | null
  isAuthenticated: boolean
  permissions: UserPermissions | null
}

/**
 * Store de autenticação usando Zustand
 * Gerencia o estado de autenticação do usuário
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      auth: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      permissions: null,

      login: (auth: Auth) => {
        // Verifica se o token não expirou
        if (auth.isExpired()) {
          set({ error: 'Sessão expirada. Faça login novamente.' })
          return
        }

        set({
          auth,
          isAuthenticated: true,
          error: null,
        })

        // Carrega permissões após login
        get().loadPermissions()
      },

      logout: async () => {
        try {
          // Chamar API de logout para remover cookie httpOnly
          await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include',
          })
        } catch (error) {
          console.error('Erro ao chamar API de logout:', error)
        }

        // Limpar estado do store
        set({
          auth: null,
          isAuthenticated: false,
          error: null,
          permissions: null,
        })

        // Limpar localStorage (Zustand persist faz isso automaticamente, mas garantimos)
        try {
          localStorage.removeItem('auth-storage')
          // Limpar também as abas ao fazer logout
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
        const { auth } = get()
        return auth?.getUser() || null
      },

      setPermissions: (permissions: UserPermissions | null) => {
        set({ permissions })
      },

      loadPermissions: async () => {
        const { auth } = get()
        
        if (!auth || !auth.getAccessToken()) {
          set({ permissions: null })
          return
        }

        try {
          // 1. Buscar dados do usuário autenticado
          const meResponse = await fetch('/api/auth/me', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${auth.getAccessToken()}`,
              'Content-Type': 'application/json',
            },
          })

          if (!meResponse.ok) {
            set({ permissions: null })
            return
          }

          const meData = await meResponse.json()
          const userId = meData.sub || meData.userId

          if (!userId) {
            set({ permissions: null })
            return
          }

          // 2. Buscar dados completos do usuário gestor
          const gestorResponse = await fetch(`/api/pessoas/usuarios-gestor/${userId}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${auth.getAccessToken()}`,
              'Content-Type': 'application/json',
            },
          })

          if (!gestorResponse.ok) {
            set({ permissions: null })
            return
          }

          const gestorData = await gestorResponse.json()

          // 3. Extrair permissões do perfil gestor
          const permissions = perfilGestorToPermissions(gestorData.perfilGestor)
          set({ permissions })
        } catch (error) {
          console.error('Erro ao carregar permissões:', error)
          set({ permissions: null })
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        auth: state.auth ? (state.auth.toJSON() as unknown as AuthStorage['auth']) : null,
        isAuthenticated: state.isAuthenticated,
        permissions: state.permissions,
      }),
      onRehydrateStorage: () => (state) => {
        // Reconstrói Auth a partir do JSON salvo
        if (state?.auth && typeof state.auth === 'object' && 'accessToken' in state.auth) {
          const authData = state.auth as unknown as AuthStorage['auth']
          if (authData) {
            const user = User.create(
              authData.user.id,
              authData.user.email,
              authData.user.name
            )
            const expiresAt = new Date(authData.expiresAt)
            const auth = Auth.create(
              authData.accessToken,
              user,
              Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60))
            )
            state.auth = auth
          }
        }
      },
    }
  )
)

