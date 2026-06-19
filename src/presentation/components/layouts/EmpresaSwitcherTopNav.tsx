'use client'

import { MdPointOfSale } from 'react-icons/md'
import { useEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'

type EmpresaSwitcherTopNavProps = {
  /** `desktop`: barra superior; `mobile`: bloco no drawer */
  variant: 'desktop' | 'mobile'
}

/** Exibe apenas o nome da empresa da sessão atual (sem troca pelo menu). */
export function EmpresaSwitcherTopNav({ variant }: EmpresaSwitcherTopNavProps) {
  const { empresa: empresaLogada, isLoading: carregandoEmpresa } = useEmpresaMe()

  if (carregandoEmpresa || !empresaLogada) {
    return null
  }

  if (variant === 'mobile') {
    return (
      <div className="mt-2 flex items-center gap-3 rounded-lg border border-primary/10 bg-primary/5 px-4 py-2">
        <MdPointOfSale className="h-5 w-5 shrink-0 text-primary-text opacity-80" aria-hidden />
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
        className="inline-flex items-center gap-1.5 border-l px-3 py-2 text-xs font-semibold text-primary-text"
        title="Empresa logada"
      >
        <MdPointOfSale className="h-5 w-5 text-primary-text opacity-80" aria-hidden />
        <span className="max-w-[150px] truncate text-sm text-primary-text">
          {empresaLogada.nomeExibicao}
        </span>
      </span>
    </div>
  )
}
