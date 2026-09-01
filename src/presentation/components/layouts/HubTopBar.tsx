'use client'

import { useEffect } from 'react'
import { Menu, LogOut } from 'lucide-react'
import { cn } from '@/src/shared/utils/cn'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { disconnectHubTab } from '@/src/presentation/utils/disconnectHubTab'
import { urlLoginDaSessaoAtual } from '@/src/presentation/gestor-pedidos/sessao/pathsGestorSessao'
import { useHubSearchSlot } from '@/src/presentation/contexts/HubSearchContext'
import { SearchBar } from '@/src/presentation/components/features/minhas-empresas/components/SearchBar'
import { isEmailSessaoPlaceholder } from '@/src/shared/utils/buildAuthFromAccessToken'

type HubTopBarProps = {
  onMenuClick: () => void
}

export function HubTopBar({ onMenuClick }: HubTopBarProps) {
  const search = useHubSearchSlot()
  const isRehydrated = useAuthStore(s => s.isRehydrated)
  const identityAuth = useAuthStore(s => s.identityAuth)
  const tenantAuth = useAuthStore(s => s.tenantAuth)
  const logoutHub = useAuthStore(s => s.logoutHub)
  const logout = useAuthStore(s => s.logout)

  const user = identityAuth?.getUser() ?? tenantAuth?.getUser() ?? null
  const nomeUsuario = isRehydrated ? (user?.getName()?.trim() ?? '') : ''
  const emailUsuario = isRehydrated ? (user?.getEmail()?.trim() ?? '') : ''

  /** Placeholder legado = sessão inválida → logout completo. */
  useEffect(() => {
    if (!isRehydrated || !user) return
    if (!isEmailSessaoPlaceholder(emailUsuario)) return
    void logout().finally(() => {
      window.location.href = urlLoginDaSessaoAtual()
    })
  }, [isRehydrated, user, emailUsuario, logout])

  const labelSecundario = !isRehydrated
    ? '…'
    : !isEmailSessaoPlaceholder(emailUsuario)
      ? emailUsuario
      : nomeUsuario || '…'

  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-gray-200 bg-white">
      <div className="flex h-14 items-center gap-2 px-2 md:gap-4 md:px-4">
        <button
          type="button"
          onClick={onMenuClick}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-700 transition hover:bg-gray-100 md:hidden"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>

        {search ? (
          <div className="min-w-0 flex-1 md:max-w-md lg:max-w-lg">
            <SearchBar
              value={search.value}
              onChange={search.onChange}
              placeholder={search.placeholder}
            />
          </div>
        ) : (
          <div className="min-w-0 flex-1 md:hidden" aria-hidden />
        )}

        <div
          className={cn(
            'ml-auto flex shrink-0 items-center gap-2 border-gray-200 pl-2 md:border-l md:pl-4',
            !search && 'flex-1 justify-end md:flex-none'
          )}
        >
          <div className="hidden min-w-0 flex-col items-end text-right leading-tight sm:flex">
            {nomeUsuario && !isEmailSessaoPlaceholder(emailUsuario) ? (
              <span className="max-w-[220px] truncate text-sm font-semibold uppercase text-gray-900">
                {nomeUsuario}
              </span>
            ) : null}
            <span
              className={cn(
                'max-w-[220px] truncate text-sm text-gray-600',
                !(nomeUsuario && !isEmailSessaoPlaceholder(emailUsuario)) &&
                  'font-medium text-gray-800'
              )}
            >
              {labelSecundario}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              void disconnectHubTab({ logoutHub })
            }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
            aria-label="Sair"
            title="Sair"
          >
            <LogOut className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </header>
  )
}
