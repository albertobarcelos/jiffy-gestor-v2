'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { Auth } from '@/src/domain/entities/Auth'
import { User } from '@/src/domain/entities/User'

interface AuthState {
  auth: Auth | null
  isAuthenticated: boolean
  isLoading: boolean
  isRehydrated: boolean
  error: string | null
  login: (auth: Auth) => void
  logout: () => Promise<void>
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  getUser: () => User | null
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
}

function authToStorageShape(auth: Auth | AuthStorage['auth'] | null): AuthStorage['auth'] | null {
  if (auth == null) return null
  if (typeof (auth as Auth).toJSON === 'function') {
    return (auth as Auth).toJSON() as AuthStorage['auth']
  }
  const plain = auth as AuthStorage['auth']
  if (
    plain &&
    typeof plain.accessToken === 'string' &&
    plain.user &&
    typeof plain.user.id === 'string' &&
    typeof plain.user.email === 'string'
  ) {
    const expiresAt =
      typeof plain.expiresAt === 'string'
        ? plain.expiresAt
        : new Date(plain.expiresAt as unknown as string).toISOString()
    return {
      accessToken: plain.accessToken,
      user: {
        id: plain.user.id,
        email: plain.user.email,
        name: plain.user.name,
      },
      expiresAt,
    }
  }
  return null
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
      isRehydrated: false,
      error: null,

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
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        auth: authToStorageShape(state.auth),
        isAuthenticated: state.isAuthenticated,
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
        // Marca como reidratado após processar o estado (sempre, mesmo se não houver dados)
        if (state) {
          state.isRehydrated = true
        }
      },
    }
  )
)

