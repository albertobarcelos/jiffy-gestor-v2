'use client'

import type { MeusApp } from '../types'
import { AppCard } from './AppCard'

export function AppsGrid({
  apps,
  onAcessar,
  busyAppId,
}: {
  apps: MeusApp[]
  onAcessar: (appId: string) => void
  /** Durante POST escolher-empresa; bloqueia outros cards e mostra estado no selecionado */
  busyAppId?: string | null
}) {
  const locked = busyAppId != null

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {apps.map(app => (
        <AppCard
          key={app.id}
          app={app}
          onAcessar={onAcessar}
          isSelecting={busyAppId === app.id}
          actionsLocked={locked && busyAppId !== app.id}
        />
      ))}
    </div>
  )
}

