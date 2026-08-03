'use client'

import { ConviteCard } from '@/src/presentation/components/features/convites/components/ConviteCard'
import type { MinhasEmpresasFeedItem, MinhasEmpresasGridCell } from '../types'
import { AppCard } from './AppCard'
import { MinhasEmpresasConvitesSection } from './MinhasEmpresasConvitesSection'
import { MinhasEmpresasPromoCarouselCard } from './MinhasEmpresasPromoCarouselCard'

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
  cells: MinhasEmpresasGridCell[]
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
          <MinhasEmpresasPromoCarouselCard key={`promo-${cell.id}`} />
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

export function MinhasEmpresasFeedGrid({
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
  conviteItems: Extract<MinhasEmpresasFeedItem, { kind: 'convite' }>[]
  empresaCells: MinhasEmpresasGridCell[]
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

  const conviteCells: MinhasEmpresasGridCell[] = conviteItems

  return (
    <div className="flex flex-col gap-4">
      {temConvites ? (
        <MinhasEmpresasConvitesSection>
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
        </MinhasEmpresasConvitesSection>
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
