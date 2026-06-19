'use client'

import type { ReactNode } from 'react'

/** Agrupa cards/linhas de convite com título sobre a borda superior. */
export function MeusAppsConvitesSection({ children }: { children: ReactNode }) {
  return (
    <section aria-labelledby="meus-apps-convites-pendentes">
      <div className="relative mt-2 border-t-2 border-b-2 border-alternate/40 bg-gray-50 py-3">
        <h2
          id="meus-apps-convites-pendentes"
          className="absolute -top-3 bg-gray-50 pr-2 text-base font-semibold leading-none text-secondary"
        >
          Convites Pendentes
        </h2>
        {children}
      </div>
    </section>
  )
}
