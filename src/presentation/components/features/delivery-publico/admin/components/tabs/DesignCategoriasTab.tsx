'use client'

import { useMemo, useState } from 'react'
import { IconPickerModal } from '@/src/presentation/components/features/grupos-produtos/IconPickerModal'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import { DinamicIcon } from '@/src/shared/utils/iconRenderer'
import { cn } from '@/src/shared/utils/cn'
import type { CategoryIconStyle, DeliveryPublicoDesignConfig } from '../../../shared/types/deliveryPublicoDesignConfig'
import { PREVIEW_DESIGN_CATEGORIES } from '../../../shared/constants/previewCatalogMock'
import { getColorPaletteById } from '../../../shared/constants/colorPalettes'

type DesignCategoriasTabProps = {
  config: DeliveryPublicoDesignConfig
  onChange: (updater: (current: DeliveryPublicoDesignConfig) => DeliveryPublicoDesignConfig) => void
}

export function DesignCategoriasTab({ config, onChange }: DesignCategoriasTabProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState(PREVIEW_DESIGN_CATEGORIES[0]?.id ?? '')
  const [iconPickerOpen, setIconPickerOpen] = useState(false)

  const palette = getColorPaletteById(config.cores.paletaId)
  const selectedCategory = PREVIEW_DESIGN_CATEGORIES.find(c => c.id === selectedCategoryId)

  const selectedIconName = useMemo(() => {
    if (!selectedCategory) return 'restaurant'
    return config.categorias.iconesPorGrupoId[selectedCategory.id] ?? selectedCategory.iconName
  }, [config.categorias.iconesPorGrupoId, selectedCategory])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-base font-semibold text-primary">Categorias</h3>
        <JiffyIconSwitch
          size="sm"
          label="Mostrar"
          labelPosition="start"
          checked={config.categorias.mostrar}
          onChange={e =>
            onChange(current => ({
              ...current,
              categorias: { ...current.categorias, mostrar: e.target.checked },
            }))
          }
        />
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <ul className="w-full shrink-0 space-y-1.5 lg:max-w-[220px]">
          {PREVIEW_DESIGN_CATEGORIES.map(cat => {
            const iconName = config.categorias.iconesPorGrupoId[cat.id] ?? cat.iconName
            const isSelected = cat.id === selectedCategoryId
            return (
              <li key={cat.id}>
                <button
                  type="button"
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg border-2 px-3 py-1.5 text-left text-sm font-semibold transition-colors',
                    isSelected
                      ? 'border-secondary bg-secondary/5 text-primary-text'
                      : 'border-gray-200 text-primary-text hover:border-gray-300'
                  )}
                >
                  <DinamicIcon iconName={iconName} color={palette.colors.primary} size={20} />
                  {cat.nome}
                </button>
              </li>
            )
          })}
        </ul>

        <div className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white p-3">
          <p className="text-sm font-semibold text-primary-text">
            Ícone · {selectedCategory?.nome ?? '—'}
          </p>

          <div className="mt-2 flex gap-2">
            {(['linha', 'preenchimento'] as CategoryIconStyle[]).map(estilo => (
              <button
                key={estilo}
                type="button"
                onClick={() =>
                  onChange(current => ({
                    ...current,
                    categorias: { ...current.categorias, estiloIcone: estilo },
                  }))
                }
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors',
                  config.categorias.estiloIcone === estilo
                    ? 'bg-secondary text-white'
                    : 'bg-gray-100 text-secondary-text hover:bg-gray-200'
                )}
              >
                {estilo === 'linha' ? 'Linha' : 'Preenchimento'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIconPickerOpen(true)}
            className="mt-2 flex w-full items-center gap-3 rounded-lg border border-dashed border-gray-300 p-3 text-left transition-colors hover:border-secondary hover:bg-secondary/5"
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: palette.colors.primary }}
            >
              <DinamicIcon iconName={selectedIconName} color="#FFFFFF" size={24} />
            </div>
            <div>
              <p className="text-sm font-semibold text-primary-text">Buscar ícone…</p>
              <p className="text-xs text-secondary-text">Clique para abrir a biblioteca de ícones</p>
            </div>
          </button>
        </div>
      </div>

      <IconPickerModal
        isOpen={iconPickerOpen}
        onClose={() => setIconPickerOpen(false)}
        selectedColor={palette.colors.primary}
        onSelect={iconName => {
          if (!selectedCategoryId) return
          onChange(current => ({
            ...current,
            categorias: {
              ...current.categorias,
              iconesPorGrupoId: {
                ...current.categorias.iconesPorGrupoId,
                [selectedCategoryId]: iconName,
              },
            },
          }))
          setIconPickerOpen(false)
        }}
      />
    </div>
  )
}
