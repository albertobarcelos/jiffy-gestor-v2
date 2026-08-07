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
    const skeletonClass =
      variant === 'mobile'
        ? 'mt-2 h-10 w-full animate-pulse rounded-lg bg-gray-200/80'
        : 'ml-auto mr-2 h-9 w-[8.5rem] animate-pulse rounded-lg border-l border-gray-200 bg-gray-200/80'
    return <div className={skeletonClass} aria-hidden />
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
    <div className="ml-auto mr-2 flex items-center">
      <span
        className="inline-flex items-center border-l px-3 py-2 text-xs font-semibold text-primary-text"
        title="Empresa logada"
      >
        <span className="max-w-[150px] truncate text-sm text-primary-text">{nomeExibicao}</span>
      </span>
    </div>
  )
}
