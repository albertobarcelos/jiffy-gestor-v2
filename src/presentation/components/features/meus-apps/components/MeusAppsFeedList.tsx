'use client'

import { ConviteListRow } from '@/src/presentation/components/features/convites/components/ConviteListRow'
import type { MeusAppsFeedItem } from '../types'
import type { MeusApp } from '../types'
import { CardGearMenu } from '@/src/presentation/components/ui/CardGearMenu'
import { cn } from '@/src/shared/utils/cn'
import { buildEmpresaCardGearItems } from '../utils/buildEmpresaCardGearItems'

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

export function MeusAppsFeedList({
  items,
  onAcessar,
  onGerenciarConvites,
  onGerenciarPerfisGestor,
  busyAppId,
  onAceitarConvite,
  onRecusarConvite,
  loadingConviteById,
}: {
  items: MeusAppsFeedItem[]
  onAcessar: (appId: string) => void
  onGerenciarConvites?: (appId: string) => void
  onGerenciarPerfisGestor?: (appId: string) => void
  busyAppId?: string | null
  onAceitarConvite: (id: string) => void
  onRecusarConvite: (id: string) => void
  loadingConviteById: Record<string, 'aceitar' | 'recusar' | null>
}) {
  const locked = busyAppId != null

  return (
    <div className="flex flex-col gap-3">
      {items.map(item =>
        item.kind === 'convite' ? (
          <ConviteListRow
            key={`convite-${item.convite.id}`}
            convite={item.convite}
            onAceitar={onAceitarConvite}
            onRecusar={onRecusarConvite}
            loadingAction={loadingConviteById[item.convite.id] ?? null}
          />
        ) : (
          <EmpresaListRow
            key={`app-${item.app.id}`}
            app={item.app}
            onAcessar={onAcessar}
            onGerenciarConvites={onGerenciarConvites}
            onGerenciarPerfisGestor={onGerenciarPerfisGestor}
            busyAppId={busyAppId}
            locked={locked}
          />
        )
      )}
    </div>
  )
}

function EmpresaListRow({
  app,
  onAcessar,
  onGerenciarConvites,
  onGerenciarPerfisGestor,
  busyAppId,
  locked,
}: {
  app: MeusApp
  onAcessar: (appId: string) => void
  onGerenciarConvites?: (appId: string) => void
  onGerenciarPerfisGestor?: (appId: string) => void
  busyAppId?: string | null
  locked: boolean
}) {
  const bloqueado = app.status === 'inativo'
  const isSelecting = busyAppId === app.id
  const actionsLocked = locked && busyAppId !== app.id
  const navDisabled = bloqueado || actionsLocked || isSelecting

  const gearItems = buildEmpresaCardGearItems(app.id, {
    navDisabled,
    onGerenciarConvites,
    onGerenciarPerfisGestor,
  })

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 px-4 py-4 sm:grid sm:grid-cols-[1fr_140px_140px] sm:items-center">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">{app.nome}</p>
          {app.tipo ? (
            <p className="truncate text-xs font-medium text-gray-500">{app.tipo}</p>
          ) : null}
        </div>
        <div className="sm:flex sm:justify-center">
          <StatusPill status={app.status} />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <CardGearMenu
            disabled={navDisabled}
            triggerAriaLabel="Opções do aplicativo"
            triggerTitle="Opções do aplicativo"
            items={gearItems}
            triggerClassName="h-10 w-10 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
          />
          <button
            type="button"
            disabled={navDisabled}
            onClick={() => {
              if (!navDisabled) {
                onAcessar(app.id)
              }
            }}
            className={cn(
              // Paridade com Aceitar em ConviteListRow: mesma altura, padding e largura em sm+
              'inline-flex h-10 w-full shrink-0 items-center justify-center rounded-lg border-0 px-4 py-0 text-sm font-semibold leading-none text-white transition sm:w-[140px]',
              navDisabled
                ? 'cursor-not-allowed bg-gray-400 text-white'
                : 'bg-secondary hover:bg-alternate'
            )}
          >
            {bloqueado ? 'Bloqueado' : isSelecting ? 'Abrindo…' : 'Acessar'}
          </button>
        </div>
      </div>
    </div>
  )
}
