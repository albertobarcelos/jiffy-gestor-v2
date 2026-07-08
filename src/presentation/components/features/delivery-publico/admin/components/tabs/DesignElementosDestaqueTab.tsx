'use client'

import { useCallback } from 'react'
import { DeliveryImageUploadField } from '@/src/presentation/components/ui/DeliveryImageUploadField'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import { showToast } from '@/src/shared/utils/toast'
import { cn } from '@/src/shared/utils/cn'
import type { DeliveryPublicoDesignConfig } from '../../../shared/types/deliveryPublicoDesignConfig'
import { getColorPaletteById } from '../../../shared/constants/colorPalettes'
import { DesignPremiumBadge } from '../DesignPremiumBadge'

type DesignElementosDestaqueTabProps = {
  config: DeliveryPublicoDesignConfig
  onChange: (updater: (current: DeliveryPublicoDesignConfig) => DeliveryPublicoDesignConfig) => void
}

const DESKTOP_SLOTS = 3

export function DesignElementosDestaqueTab({ config, onChange }: DesignElementosDestaqueTabProps) {
  const palette = getColorPaletteById(config.cores.paletaId)
  const { elementosDestaque } = config

  const handleDesktopImage = useCallback(
    (index: number) => async (file: File) => {
      const url = URL.createObjectURL(file)
      onChange(current => {
        const imagens = [...current.elementosDestaque.imagensDesktop]
        imagens[index] = url
        return {
          ...current,
          elementosDestaque: {
            ...current.elementosDestaque,
            imagensDesktop: imagens.slice(0, DESKTOP_SLOTS),
          },
        }
      })
    },
    [onChange]
  )

  return (
    <div className="space-y-5">
      <section>
        <h3 className="text-base font-semibold text-primary">Cor de fundo</h3>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() =>
              onChange(current => ({
                ...current,
                elementosDestaque: { ...current.elementosDestaque, corFundoModo: 'principal' },
              }))
            }
            className={cn(
              'flex items-center gap-3 rounded-xl border-2 p-3 text-left',
              elementosDestaque.corFundoModo === 'principal'
                ? 'border-secondary bg-secondary/5'
                : 'border-gray-200'
            )}
          >
            <div
              className="h-10 w-10 rounded-lg border border-gray-200"
              style={{ backgroundColor: palette.colors.primary }}
            />
            <span className="text-sm font-semibold text-primary-text">Cor principal</span>
          </button>

          <button
            type="button"
            onClick={() =>
              onChange(current => ({
                ...current,
                elementosDestaque: { ...current.elementosDestaque, corFundoModo: 'personalizada' },
              }))
            }
            className={cn(
              'flex items-center gap-3 rounded-xl border-2 p-3 text-left',
              elementosDestaque.corFundoModo === 'personalizada'
                ? 'border-secondary bg-secondary/5'
                : 'border-gray-200'
            )}
          >
            <input
              type="color"
              value={elementosDestaque.corFundoPersonalizada}
              onClick={e => e.stopPropagation()}
              onChange={e =>
                onChange(current => ({
                  ...current,
                  elementosDestaque: {
                    ...current.elementosDestaque,
                    corFundoModo: 'personalizada',
                    corFundoPersonalizada: e.target.value,
                  },
                }))
              }
              className="h-10 w-10 cursor-pointer rounded-lg border border-gray-200"
            />
            <span className="text-sm font-semibold text-primary-text">Cor personalizada</span>
          </button>
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-primary">Carrossel de imagens</h3>
          <DesignPremiumBadge label="Mais" />
        </div>
        <div className="mt-2">
          <JiffyIconSwitch
            size="sm"
            label="Ativar carrossel"
            labelPosition="start"
            checked={elementosDestaque.carrosselAtivo}
            disabled
            onChange={() => showToast.info('Carrossel estará disponível em breve.')}
          />
        </div>
      </section>

      <section>
        <h3 className="text-base font-semibold text-primary">Imagens para computadores</h3>
        <p className="mt-0.5 text-xs text-secondary-text">Tamanho recomendado: 1920px × 900px</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: DESKTOP_SLOTS }, (_, index) => (
            <DeliveryImageUploadField
              key={index}
              label={`Imagem ${index + 1}`}
              previewUrl={elementosDestaque.imagensDesktop[index] ?? null}
              helperText="Máx. 5 MB"
              onFileSelected={handleDesktopImage(index)}
              onClearPreview={() =>
                onChange(current => {
                  const imagens = [...current.elementosDestaque.imagensDesktop]
                  imagens[index] = ''
                  return {
                    ...current,
                    elementosDestaque: {
                      ...current.elementosDestaque,
                      imagensDesktop: imagens.filter(Boolean),
                    },
                  }
                })
              }
            />
          ))}
        </div>
      </section>

      <section>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-primary-text">
          <input
            type="checkbox"
            checked={elementosDestaque.usarImagensMobileDistintas}
            onChange={e =>
              onChange(current => ({
                ...current,
                elementosDestaque: {
                  ...current.elementosDestaque,
                  usarImagensMobileDistintas: e.target.checked,
                },
              }))
            }
            className="rounded border-gray-300 text-secondary focus:ring-secondary"
          />
          Carregar outras imagens para celular
        </label>
        {elementosDestaque.usarImagensMobileDistintas ? (
          <p className="mt-1 text-xs text-secondary-text">Tamanho recomendado: 820px × 1000px</p>
        ) : null}
      </section>
    </div>
  )
}
