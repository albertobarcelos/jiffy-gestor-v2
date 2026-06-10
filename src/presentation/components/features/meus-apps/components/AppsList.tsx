'use client'

import type { MeusApp } from '../types'
import { cn } from '@/src/shared/utils/cn'

function StatusPill({ status }: { status: MeusApp['status'] }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
        status === 'ativo'
          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
          : 'bg-gray-100 text-gray-700 ring-1 ring-gray-200'
      )}
    >
      {status === 'ativo' ? 'Ativo' : 'Inativo'}
    </span>
  )
}

export function AppsList({
  apps,
  onAcessar,
  busyAppId,
}: {
  apps: MeusApp[]
  onAcessar: (appId: string) => void
  busyAppId?: string | null
}) {
  const locked = busyAppId != null

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="hidden grid-cols-[1fr_140px_140px] gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-600 sm:grid">
        <div>Aplicativo</div>
        <div className="text-center">Status</div>
        <div className="text-right">Ação</div>
      </div>

      <div className="divide-y divide-gray-100">
        {apps.map(app => {
          const bloqueado = app.status === 'inativo'
          const isSelecting = busyAppId === app.id
          const actionsLocked = locked && busyAppId !== app.id
          const interactionDisabled = bloqueado || actionsLocked || isSelecting
          return (
          <div key={app.id} className="flex flex-col gap-3 px-4 py-4 sm:grid sm:grid-cols-[1fr_140px_140px] sm:items-center">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900">{app.nome}</p>
              {app.tipo ? (
                <p className="truncate text-xs font-medium text-gray-500">{app.tipo}</p>
              ) : null}
            </div>
            <div className="sm:flex sm:justify-center">
              <StatusPill status={app.status} />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                disabled={interactionDisabled}
                onClick={() => {
                  if (!interactionDisabled) {
                    onAcessar(app.id)
                  }
                }}
                className={cn(
                  'inline-flex h-10 w-full items-center justify-center rounded-full px-2 text-sm font-medium shadow-sm transition sm:w-auto disabled:opacity-100',
                  bloqueado || isSelecting
                    ? 'cursor-not-allowed bg-gray-400 text-white'
                    : 'bg-sky-500 text-white hover:bg-sky-600'
                )}
              >
                {bloqueado ? 'Empresa Bloqueada' : isSelecting ? 'Abrindo…' : 'Acessar Empresa'}
              </button>
            </div>
          </div>
          )
        })}
      </div>
    </div>
  )
}

