'use client'

import { DESIGN_TABS } from '../../shared/constants/designTabs'
import type { DesignTabId } from '../../shared/types/deliveryPublicoDesignConfig'
import { DesignLobbyCard } from './DesignLobbyCard'

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
            <DesignLobbyCard
              icon={tab.icon}
              title={tab.label}
              description={tab.descricao}
              onClick={() => onAbrirSecao(tab.id)}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
