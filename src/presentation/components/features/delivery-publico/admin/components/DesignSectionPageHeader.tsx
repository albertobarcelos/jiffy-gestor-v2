'use client'

import {
  getDesignSectionById,
  type DesignSectionId,
} from '../../shared/constants/designTabs'

type DesignSectionPageHeaderProps = {
  sectionId: DesignSectionId
}

/** Cabeçalho padrão das páginas dentro de Personalizar loja. */
export function DesignSectionPageHeader({ sectionId }: DesignSectionPageHeaderProps) {
  const section = getDesignSectionById(sectionId)
  if (!section) return null

  return (
    <div className="flex items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
        <section.Icon className="h-6 w-6" aria-hidden />
      </div>
      <div>
        <h1 className="text-xl font-semibold text-primary">{section.label}</h1>
        <p className="mt-1 text-sm text-secondary-text">{section.description}</p>
      </div>
    </div>
  )
}
