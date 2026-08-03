'use client'

import { useEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'

type EmpresaSwitcherTopNavProps = {
  /** `desktop`: barra superior; `mobile`: bloco no drawer */
  variant: 'desktop' | 'mobile'
}

/** Exibe apenas o nome da empresa da sessão atual (sem troca pelo menu). */
export function EmpresaSwitcherTopNav({ variant }: EmpresaSwitcherTopNavProps) {
  const { empresa: empresaLogada, isLoading: carregandoEmpresa } = useEmpresaMe()

  if (carregandoEmpresa) {
    const skeletonClass =
      variant === 'mobile'
        ? 'mt-2 h-10 w-full animate-pulse rounded-lg bg-gray-200/80'
        : 'ml-auto mr-2 h-9 w-[8.5rem] animate-pulse rounded-lg border-l border-gray-200 bg-gray-200/80'
    return <div className={skeletonClass} aria-hidden />
  }

  if (!empresaLogada) {
    return null
  }

  if (variant === 'mobile') {
    return (
      <div className="mt-2 flex items-center gap-3 rounded-lg border border-primary/10 bg-primary/5 px-4 py-2">
        <div className="flex min-w-0 flex-col">
          <span className="text-xs font-medium text-primary-text/70">Empresa logada</span>
          <span className="truncate text-xs font-semibold text-primary-text">
            {empresaLogada.nomeExibicao}
          </span>
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
        <span className="max-w-[150px] truncate text-sm text-primary-text">
          {empresaLogada.nomeExibicao}
        </span>
      </span>
    </div>
  )
}
