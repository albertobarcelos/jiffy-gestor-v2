'use client'

import { DESIGN_TABS } from '../../shared/constants/designTabs'
import type { DesignTabId } from '../../shared/types/deliveryPublicoDesignConfig'

type DesignSecoesCardsProps = {
  onAbrirSecao: (section: DesignTabId) => void
}

export function DesignSecoesCards({ onAbrirSecao }: DesignSecoesCardsProps) {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <h1 className="text-xl font-bold text-primary md:text-2xl">Personalizar Loja</h1>
      <p className="mt-1 text-sm text-secondary-text">
        Escolha o que deseja configurar. O preview à direita atualiza conforme você edita.
      </p>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DESIGN_TABS.map(tab => (
          <li key={tab.id}>
            <button
              type="button"
              onClick={() => onAbrirSecao(tab.id)}
              className="group flex h-full w-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white text-center shadow-sm transition-all hover:border-alternate/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-alternate/40"
            >
              <span className="flex min-h-[9rem] w-full items-center justify-center bg-alternate/20 text-alternate transition-colors group-hover:bg-alternate/30">
                <tab.icon className="h-16 w-16" aria-hidden />
              </span>
              <span className="flex flex-1 flex-col justify-center gap-1.5 px-4 py-5">
                <span className="block text-base font-bold text-primary-text group-hover:text-alternate">
                  {tab.label}
                </span>
                <span className="block text-sm leading-snug text-secondary-text">
                  {tab.descricao}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
