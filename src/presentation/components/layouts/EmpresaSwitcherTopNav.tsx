'use client'

import { useEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { useAuthStore } from '@/src/presentation/stores/authStore'

type EmpresaSwitcherTopNavProps = {
  /** `desktop`: barra superior; `mobile`: bloco no drawer */
  variant: 'desktop' | 'mobile'
}

/**
 * Nome da empresa da sessão desta aba.
 * Nunca exibe nome de outra empresa (anti-mix multi-aba):
 * 1) `useEmpresaMe` só se `empresa.id === empresaId` do token
 * 2) senão, fallback em `hubEmpresas` pelo mesmo id
 */
export function EmpresaSwitcherTopNav({ variant }: EmpresaSwitcherTopNavProps) {
  const { empresa: empresaLogada, isLoading: carregandoEmpresa } = useEmpresaMe()
  const empresaId = useTenantEmpresaId()
  const hubEmpresas = useAuthStore(s => s.hubEmpresas)

  const nomeExibicao = (() => {
    if (empresaLogada?.id && empresaId && empresaLogada.id === empresaId) {
      return empresaLogada.nomeExibicao
    }
    if (empresaId && hubEmpresas?.length) {
      const fromHub = hubEmpresas.find(e => e.id === empresaId)
      if (fromHub) {
        return fromHub.nomeFantasia?.trim() || null
      }
    }
    return null
  })()

  if (carregandoEmpresa && !nomeExibicao) {
    if (variant === 'mobile') {
      return (
        <div className="mt-2 h-10 w-full animate-pulse rounded-lg bg-gray-200/80" aria-hidden />
      )
    }
    return (
      <div
        className="h-8 w-[7rem] shrink-0 animate-pulse rounded-lg bg-gray-200/80 sm:w-[9rem]"
        aria-hidden
      />
    )
  }

  if (!nomeExibicao) {
    return null
  }

  if (variant === 'mobile') {
    return (
      <div className="mt-2 flex items-center gap-3 rounded-lg border border-primary/10 bg-primary/5 px-4 py-2">
        <div className="flex min-w-0 flex-col">
          <span className="text-xs font-medium text-primary-text/70">Empresa logada</span>
          <span className="truncate text-xs font-semibold text-primary-text">{nomeExibicao}</span>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-w-0 max-w-[7rem] px-2 py-1.5 sm:max-w-[9rem] sm:px-3 lg:max-w-[12rem] xl:max-w-[18rem] 2xl:max-w-[24rem]"
      title={nomeExibicao}
    >
      <span className="block truncate whitespace-nowrap border-l border-gray-200 pl-2 text-xs font-semibold text-primary-text sm:pl-3 sm:text-sm">
        {nomeExibicao}
      </span>
    </div>
  )
}
