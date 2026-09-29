import { DESIGN_MODELOS_ABAS, type DesignModelosAbaId } from '../../shared/constants/designTabs'
import { DesignLobbyCard } from './DesignLobbyCard'

type DesignModelosCardsProps = {
  onAbrirAba: (aba: DesignModelosAbaId) => void
}

export function DesignModelosCards({ onAbrirAba }: DesignModelosCardsProps) {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <p className="text-sm text-secondary-text">
        Escolha o que deseja ajustar. O preview à direita atualiza conforme você edita.
      </p>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DESIGN_MODELOS_ABAS.map(aba => (
          <li key={aba.id}>
            <DesignLobbyCard
              icon={aba.icon}
              title={aba.label}
              description={aba.descricao}
              onClick={() => onAbrirAba(aba.id)}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
