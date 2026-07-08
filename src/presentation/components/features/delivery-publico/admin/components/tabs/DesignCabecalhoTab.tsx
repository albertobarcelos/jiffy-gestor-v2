'use client'

import { useCallback } from 'react'
import { DeliveryImageUploadField } from '@/src/presentation/components/ui/DeliveryImageUploadField'
import type { DeliveryPublicoDesignConfig } from '../../../shared/types/deliveryPublicoDesignConfig'
import { CABECALHO_NOME_MAX_LENGTH } from '../../../shared/constants/defaultDesignConfig'

type DesignCabecalhoTabProps = {
  config: DeliveryPublicoDesignConfig
  onChange: (updater: (current: DeliveryPublicoDesignConfig) => DeliveryPublicoDesignConfig) => void
}

function readFileAsObjectUrl(file: File): string {
  return URL.createObjectURL(file)
}

export function DesignCabecalhoTab({ config, onChange }: DesignCabecalhoTabProps) {
  const { cabecalho } = config

  const handleImage = useCallback(
    (field: 'logoUrl' | 'capaUrl') => async (file: File) => {
      const url = readFileAsObjectUrl(file)
      onChange(current => ({
        ...current,
        cabecalho: { ...current.cabecalho, [field]: url },
      }))
    },
    [onChange]
  )

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-base font-semibold text-primary">Dados do negócio</h3>
        <div className="mt-4">
          <label htmlFor="design-nome-negocio" className="text-sm font-semibold text-primary-text">
            Nome do seu negócio
          </label>
          <input
            id="design-nome-negocio"
            type="text"
            maxLength={CABECALHO_NOME_MAX_LENGTH}
            value={cabecalho.nomeExibicao}
            onChange={e =>
              onChange(current => ({
                ...current,
                cabecalho: {
                  ...current.cabecalho,
                  nomeExibicao: e.target.value.slice(0, CABECALHO_NOME_MAX_LENGTH),
                },
              }))
            }
            className="mt-2 w-full max-w-md rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <p className="mt-1 text-xs text-secondary-text">
            {cabecalho.nomeExibicao.length}/{CABECALHO_NOME_MAX_LENGTH}
          </p>
        </div>
      </section>

      <section>
        <h3 className="text-base font-semibold text-primary">Logo</h3>
        <div className="mt-4 max-w-md">
          <DeliveryImageUploadField
            label=""
            previewUrl={cabecalho.logoUrl}
            helperText="Máx. 5 MB · PNG, JPG ou WebP"
            emptyHint="Arraste e solte a imagem aqui ou Selecionar arquivo"
            onFileSelected={handleImage('logoUrl')}
            onClearPreview={() =>
              onChange(current => ({
                ...current,
                cabecalho: { ...current.cabecalho, logoUrl: null },
              }))
            }
          />
        </div>
        <fieldset className="mt-4">
          <legend className="text-sm font-semibold text-primary-text">Forma</legend>
          <div className="mt-2 flex gap-4">
            {(['circular', 'quadrada'] as const).map(formato => (
              <label key={formato} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="logo-formato"
                  checked={cabecalho.logoFormato === formato}
                  onChange={() =>
                    onChange(current => ({
                      ...current,
                      cabecalho: { ...current.cabecalho, logoFormato: formato },
                    }))
                  }
                  className="text-secondary focus:ring-secondary"
                />
                <span className="capitalize text-primary-text">{formato === 'circular' ? 'Circular' : 'Quadrada'}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section>
        <h3 className="text-base font-semibold text-primary">Capa</h3>
        <div className="mt-4 max-w-md">
          <DeliveryImageUploadField
            label=""
            previewUrl={cabecalho.capaUrl}
            helperText="Máx. 5 MB · PNG, JPG ou WebP"
            emptyHint="Arraste e solte a imagem aqui ou Selecionar arquivo"
            onFileSelected={handleImage('capaUrl')}
            onClearPreview={() =>
              onChange(current => ({
                ...current,
                cabecalho: { ...current.cabecalho, capaUrl: null },
              }))
            }
          />
        </div>
      </section>
    </div>
  )
}
