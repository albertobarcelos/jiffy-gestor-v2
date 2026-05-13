'use client'

import { useCallback } from 'react'
import { ArrowLeft } from 'lucide-react'
import { MeusAppsTopNav } from '@/src/presentation/components/features/meus-apps/components/MeusAppsTopNav'
import { useEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import { PerfisGestorList } from './PerfisGestorList'

export function PerfisGestorHubPage() {
  const { empresa } = useEmpresaMe()

  const nomeEmpresa = empresa?.nomeExibicao ?? ''

  const handleVoltar = useCallback(() => {
    if (typeof window === 'undefined') return

    try {
      const { opener } = window
      if (opener && !opener.closed) {
        opener.focus()
        window.close()
        return
      }
    } catch {
      /* opener indisponível */
    }

    window.open('/meus-apps', '_blank', 'noopener,noreferrer')
    try {
      window.close()
    } catch {
      /* noop */
    }

    window.setTimeout(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        window.location.assign('/meus-apps')
      }
    }, 250)
  }, [])

  return (
    <div className="flex h-full min-h-screen min-w-0 flex-col bg-[#fafafa]">
      <MeusAppsTopNav />

      <div className="mx-auto w-full max-w-6xl flex-shrink-0 px-3 pt-4 md:px-8">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleVoltar}
            className="flex h-8 shrink-0 items-center gap-2 rounded-lg bg-secondary px-5 font-exo text-sm font-semibold text-info transition-colors hover:bg-alternate"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
            Voltar
          </button>
        </div>

        {nomeEmpresa && (
          <div className="mt-6 flex flex-col gap-4 border-b border-gray-200 pb-6 md:mt-8 md:flex-row md:items-center md:justify-between md:gap-8">
            <div className="min-w-0">
              <h1 className="text-lg font-normal uppercase tracking-tight text-primary-text md:text-xl">
                {nomeEmpresa}
              </h1>
              <p className="mt-1 text-sm text-secondary-text">Ativo</p>
            </div>
            <div
              className="flex h-28 w-full max-w-[220px] shrink-0 items-center justify-center self-start rounded-lg border border-dashed border-gray-300 bg-white font-nunito text-xs text-secondary-text md:self-center"
              aria-hidden
            >
              Imagem da empresa
            </div>
          </div>
        )}
      </div>

      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 md:px-8 md:pb-8">
        <PerfisGestorList />
      </div>
    </div>
  )
}
