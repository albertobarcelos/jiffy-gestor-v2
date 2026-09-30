'use client'

import { MdPalette } from 'react-icons/md'
import { DESIGN_SECTIONS, type DesignSectionId } from '../../shared/constants/designTabs'

type DesignSectionCardsProps = {
  onOpenSection: (section: DesignSectionId) => void
}

export function DesignSectionCards({ onOpenSection }: DesignSectionCardsProps) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
          <MdPalette className="h-6 w-6" aria-hidden />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-primary">Personalizar loja</h1>
          <p className="mt-1 text-sm text-secondary-text">
            Escolha uma seção para editar. Você pode abrir várias abas e alternar entre elas.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {DESIGN_SECTIONS.map(section => (
          <button
            key={section.id}
            type="button"
            onClick={() => onOpenSection(section.id)}
            className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
              <section.Icon className="h-6 w-6" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-primary">{section.label}</span>
              <span className="mt-0.5 block text-xs text-secondary-text">
                {section.description}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
