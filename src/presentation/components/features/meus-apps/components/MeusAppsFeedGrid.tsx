'use client'

import { ConviteCard } from '@/src/presentation/components/features/convites/components/ConviteCard'
import type { MeusAppsFeedItem, MeusAppsGridCell } from '../types'
import { AppCard } from './AppCard'
import { MeusAppsConvitesSection } from './MeusAppsConvitesSection'
import { MeusAppsPromoCarouselCard } from './MeusAppsPromoCarouselCard'

function FeedGrid({
  cells,
  onAcessar,
  onGerenciarConvites,
  onGerenciarPerfisGestor,
  busyAppId,
  onAceitarConvite,
  onRecusarConvite,
  loadingConviteById,
  locked,
}: {
  cells: MeusAppsGridCell[]
  onAcessar: (appId: string) => void
  onGerenciarConvites?: (appId: string) => void
  onGerenciarPerfisGestor?: (appId: string) => void
  busyAppId?: string | null
  onAceitarConvite: (id: string) => void
  onRecusarConvite: (id: string) => void
  loadingConviteById: Record<string, 'aceitar' | 'recusar' | null>
  locked: boolean
}) {
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

export function MeusAppsFeedGrid({
  conviteItems,
  empresaCells,
  onAcessar,
  onGerenciarConvites,
  onGerenciarPerfisGestor,
  busyAppId,
  onAceitarConvite,
  onRecusarConvite,
  loadingConviteById,
}: {
  conviteItems: Extract<MeusAppsFeedItem, { kind: 'convite' }>[]
  empresaCells: MeusAppsGridCell[]
  onAcessar: (appId: string) => void
  onGerenciarConvites?: (appId: string) => void
  onGerenciarPerfisGestor?: (appId: string) => void
  busyAppId?: string | null
  onAceitarConvite: (id: string) => void
  onRecusarConvite: (id: string) => void
  loadingConviteById: Record<string, 'aceitar' | 'recusar' | null>
}) {
  const locked = busyAppId != null
  const temConvites = conviteItems.length > 0
  const temEmpresas = empresaCells.length > 0

  const conviteCells: MeusAppsGridCell[] = conviteItems

  return (
    <div className="flex flex-col gap-4">
      {temConvites ? (
        <MeusAppsConvitesSection>
          <FeedGrid
            cells={conviteCells}
            onAcessar={onAcessar}
            onGerenciarConvites={onGerenciarConvites}
            onGerenciarPerfisGestor={onGerenciarPerfisGestor}
            busyAppId={busyAppId}
            onAceitarConvite={onAceitarConvite}
            onRecusarConvite={onRecusarConvite}
            loadingConviteById={loadingConviteById}
            locked={locked}
          />
        </MeusAppsConvitesSection>
      ) : null}

      {temEmpresas ? (
        <section aria-label="Empresas vinculadas">
          <FeedGrid
            cells={empresaCells}
            onAcessar={onAcessar}
            onGerenciarConvites={onGerenciarConvites}
            onGerenciarPerfisGestor={onGerenciarPerfisGestor}
            busyAppId={busyAppId}
            onAceitarConvite={onAceitarConvite}
            onRecusarConvite={onRecusarConvite}
            loadingConviteById={loadingConviteById}
            locked={locked}
          />
        </section>
      ) : null}
    </div>
  )
}
