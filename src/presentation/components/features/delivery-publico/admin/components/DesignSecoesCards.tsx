'use client'

import { DESIGN_TABS } from '../../shared/constants/designTabs'
import type { DesignTabId } from '../../shared/types/deliveryPublicoDesignConfig'

type DesignSecoesCardsProps = {
  onAbrirSecao: (section: DesignTabId) => void
}

export function DesignSecoesCards({ onAbrirSecao }: DesignSecoesCardsProps) {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-xl font-bold text-primary md:text-2xl">Personalizar Loja</h1>
      <p className="mt-1 text-sm text-secondary-text">
        Escolha o que deseja configurar. O preview à direita atualiza conforme você edita.
      </p>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {DESIGN_TABS.map(tab => (
          <li key={tab.id}>
            <button
              type="button"
              onClick={() => onAbrirSecao(tab.id)}
              className="group flex h-full w-full flex-col items-start gap-3 rounded-2xl border-2 border-gray-200 bg-white p-5 text-left shadow-sm transition-all hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                <tab.icon className="h-6 w-6" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-base font-semibold text-primary-text group-hover:text-primary">
                  {tab.label}
                </span>
                <span className="mt-1 block text-sm leading-snug text-secondary-text">
                  {tab.descricao}
                </span>
              </span>
              <span className="mt-auto text-xs font-semibold uppercase tracking-wide text-primary opacity-80">
                {tab.cta} →
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
