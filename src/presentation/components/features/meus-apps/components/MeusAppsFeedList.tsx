'use client'

import { ConviteListRow } from '@/src/presentation/components/features/convites/components/ConviteListRow'
import type { MeusAppsFeedItem } from '../types'
import type { MeusApp } from '../types'
import { CardGearMenu } from '@/src/presentation/components/ui/CardGearMenu'
import { cn } from '@/src/shared/utils/cn'
import { buildEmpresaCardGearItems } from '../utils/buildEmpresaCardGearItems'

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
  const interactionDisabled = bloqueado || actionsLocked || isSelecting

  const gearItems = buildEmpresaCardGearItems(app.id, {
    navDisabled: interactionDisabled,
    onGerenciarConvites,
    onGerenciarPerfisGestor,
  })

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 px-4 py-4 sm:grid sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="min-w-0">
          {/* TODO: substituir por plano real quando o backend expuser o campo */}
          <span
            className="mb-1 block text-[11px] font-semibold leading-none text-secondary"
            title="Jiffy Starter"
          >
            Jiffy Starter
          </span>
          <p className="truncate text-sm font-semibold text-gray-900">{app.nome}</p>
          {app.tipo ? (
            <p className="truncate text-xs font-medium text-gray-500">{app.tipo}</p>
          ) : null}
        </div>
        <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
          <button
            type="button"
            disabled={interactionDisabled}
            onClick={() => {
              if (!interactionDisabled) {
                onAcessar(app.id)
              }
            }}
            className={cn(
              'inline-flex h-10 min-w-0 flex-1 items-center justify-center rounded-lg border-0 px-4 py-0 text-sm font-semibold leading-none text-white transition sm:w-[140px] sm:flex-none disabled:opacity-100',
              bloqueado || isSelecting
                ? 'cursor-not-allowed bg-gray-400 text-white'
                : 'bg-secondary hover:bg-alternate'
            )}
          >
            {bloqueado ? 'Bloqueado' : isSelecting ? 'Abrindo…' : 'Acessar'}
          </button>
          <CardGearMenu
            disabled={interactionDisabled}
            triggerAriaLabel="Opções do aplicativo"
            triggerTitle="Opções do aplicativo"
            items={gearItems}
            triggerClassName="h-10 w-10 shrink-0 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
          />
        </div>
      </div>
    </div>
  )
}
