'use client'

import { ConviteCard } from '@/src/presentation/components/features/convites/components/ConviteCard'
import type { MeusAppsGridCell } from '../types'
import { AppCard } from './AppCard'
import { MeusAppsPromoCarouselCard } from './MeusAppsPromoCarouselCard'

export function MeusAppsFeedGrid({
  cells,
  onAcessar,
  onGerenciarConvites,
  onGerenciarPerfisGestor,
  busyAppId,
  onAceitarConvite,
  onRecusarConvite,
  loadingConviteById,
}: {
  cells: MeusAppsGridCell[]
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
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {cells.map(cell =>
        cell.kind === 'promo' ? (
          <MeusAppsPromoCarouselCard key={`promo-${cell.id}`} />
        ) : cell.kind === 'convite' ? (
          <ConviteCard
            key={`convite-${cell.convite.id}`}
            convite={cell.convite}
            onAceitar={onAceitarConvite}
            onRecusar={onRecusarConvite}
            loadingAction={loadingConviteById[cell.convite.id] ?? null}
          />
        ) : (
          <AppCard
            key={`app-${cell.app.id}`}
            app={cell.app}
            onAcessar={onAcessar}
            onGerenciarConvites={onGerenciarConvites}
            onGerenciarPerfisGestor={onGerenciarPerfisGestor}
            isSelecting={busyAppId === cell.app.id}
            actionsLocked={locked && busyAppId !== cell.app.id}
          />
        )
      )}
    </div>
  )
}
