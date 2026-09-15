'use client'

import { cn } from '@/src/shared/utils/cn'
import type {
  ColorPaletteId,
  DeliveryPublicoDesignConfig,
  DesignCustomColors,
} from '../../../shared/types/deliveryPublicoDesignConfig'
import {
  COLOR_PALETTES,
  getPublishablePaletteLabel,
  resolveCustomPaletteColors,
  resolveDesignPaletteColors,
} from '../../../shared/constants/colorPalettes'
import { DesignSelectableCard } from '../DesignSelectableCard'

type DesignCoresTabProps = {
  config: DeliveryPublicoDesignConfig
  onChange: (updater: (current: DeliveryPublicoDesignConfig) => DeliveryPublicoDesignConfig) => void
}

type CustomColorKey = keyof DesignCustomColors

const CUSTOM_COLOR_FIELDS: { key: CustomColorKey; label: string }[] = [
  { key: 'primary', label: 'Primária' },
  { key: 'primaryDark', label: 'Escura' },
  { key: 'surface', label: 'Fundo' },
  { key: 'text', label: 'Texto' },
]

const HEX6_PATTERN = /^#[0-9A-Fa-f]{6}$/

function normalizeHexInput(value: string): string | null {
  const trimmed = value.trim()
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`
  if (!HEX6_PATTERN.test(withHash)) return null
  return withHash.toUpperCase()
}

function PaletteSwatches({ paletteId }: { paletteId: ColorPaletteId }) {
  const palette = COLOR_PALETTES.find(p => p.id === paletteId)
  if (!palette) return null
  const swatches = [
    palette.colors.primary,
    palette.colors.primaryDark,
    palette.colors.surface,
    palette.colors.text,
  ]
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {swatches.map((color, index) => (
        <div
          key={`${paletteId}-${index}`}
          className="h-8 rounded-md border border-gray-100"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  )
}

type CustomPaletteCardProps = {
  selected: boolean
  colors: DesignCustomColors
  onSelect: () => void
  onColorChange: (key: CustomColorKey, value: string) => void
}

function CustomPaletteCard({ selected, colors, onSelect, onColorChange }: CustomPaletteCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
      className={cn(
        'relative flex flex-col rounded-xl border-2 bg-white p-3 text-left transition-colors',
        selected ? 'border-secondary shadow-sm' : 'border-gray-200 hover:border-gray-300'
      )}
    >
      <div className="grid grid-cols-2 gap-1.5">
        {CUSTOM_COLOR_FIELDS.map(({ key, label }) => (
          <label
            key={key}
            className="group relative block cursor-pointer"
            title={`${label}: ${colors[key]} — clique para escolher`}
            onClick={event => event.stopPropagation()}
          >
            <span
              className="relative flex h-8 items-end rounded-md border border-gray-200 px-1.5 pb-0.5"
              style={{ backgroundColor: colors[key] }}
            >
              <span className="text-[9px] font-semibold uppercase tracking-wide text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.75)]">
                {label}
              </span>
            </span>
            <input
              type="color"
              value={HEX6_PATTERN.test(colors[key]) ? colors[key] : '#000000'}
              aria-label={`Escolher cor ${label}`}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              onChange={event => onColorChange(key, event.target.value.toUpperCase())}
            />
          </label>
        ))}
      </div>
      <span className="mt-1.5 text-sm font-semibold text-primary-text">Personalizada</span>
      <span className="mt-0.5 text-xs text-secondary-text">
        Clique em cada cor para abrir o seletor hexadecimal
      </span>
    </div>
  )
}

export function DesignCoresTab({ config, onChange }: DesignCoresTabProps) {
  const customColors = resolveCustomPaletteColors(config.cores.personalizadas)
  const isCustomSelected = config.cores.paletaId === 'personalizada'

  const selectCustom = () => {
    onChange(current => ({
      ...current,
      cores: {
        ...current.cores,
        paletaId: 'personalizada',
        personalizadas: resolveCustomPaletteColors(
          current.cores.personalizadas ??
            (current.cores.paletaId !== 'personalizada'
              ? resolveDesignPaletteColors(current)
              : undefined)
        ),
      },
    }))
  }

  const updateCustomColor = (key: CustomColorKey, value: string) => {
    const hex = normalizeHexInput(value)
    if (!hex) return

    onChange(current => {
      const base = resolveCustomPaletteColors(
        current.cores.personalizadas ??
          (current.cores.paletaId !== 'personalizada'
            ? resolveDesignPaletteColors(current)
            : undefined)
      )
      return {
        ...current,
        cores: {
          ...current.cores,
          paletaId: 'personalizada',
          personalizadas: { ...base, [key]: hex },
        },
      }
    })
  }

  return (
    <div className="space-y-2">
      <h3 className="text-base font-semibold text-primary">Cores sugeridas</h3>
      <p className="text-sm text-secondary-text">
        Teste qualquer paleta no preview. Por enquanto, apenas as paletas{' '}
        {getPublishablePaletteLabel()} podem ser publicadas.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <CustomPaletteCard
          selected={isCustomSelected}
          colors={customColors}
          onSelect={selectCustom}
          onColorChange={updateCustomColor}
        />
        {COLOR_PALETTES.map(paleta => (
          <DesignSelectableCard
            key={paleta.id}
            selected={config.cores.paletaId === paleta.id}
            premium={paleta.premium}
            title={paleta.nome}
            onClick={() =>
              onChange(current => ({
                ...current,
                cores: {
                  ...current.cores,
                  paletaId: paleta.id,
                },
              }))
            }
          >
            <PaletteSwatches paletteId={paleta.id} />
          </DesignSelectableCard>
        ))}
      </div>
    </div>
  )
}
