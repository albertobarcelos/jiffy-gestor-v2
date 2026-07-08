'use client'

import type { DeliveryPublicoDesignConfig } from '../../../shared/types/deliveryPublicoDesignConfig'
import { CABECALHO_NOME_MAX_LENGTH } from '../../../shared/constants/defaultDesignConfig'
import { DeliveryImageUploadField } from '@/src/presentation/components/ui/DeliveryImageUploadField'
import { useDesignCabecalhoMidia } from '../../hooks/useDesignCabecalhoMidia'

type DesignCabecalhoTabProps = {
  config: DeliveryPublicoDesignConfig
  slug?: string
  hasEmpresaDelivery: boolean
  onChange: (updater: (current: DeliveryPublicoDesignConfig) => DeliveryPublicoDesignConfig) => void
}

export function DesignCabecalhoTab({
  config,
  slug,
  hasEmpresaDelivery,
  onChange,
}: DesignCabecalhoTabProps) {
  const { cabecalho } = config

  const {
    isUploadingLogo,
    isUploadingBanner,
    handleLogoUpload,
    handleBannerUpload,
    clearLogo,
    clearBanner,
    canUpload,
  } = useDesignCabecalhoMidia({
    slug,
    hasEmpresaDelivery,
    logoUrl: cabecalho.logoUrl,
    capaUrl: cabecalho.capaUrl,
    onChange,
  })

  return (
    <div className="space-y-5">
      <section>
        <h3 className="text-base font-semibold text-primary">Dados do negócio</h3>
        <div className="mt-2">
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
            className="mt-1 w-full max-w-md rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-primary"
          />
          <p className="mt-0.5 text-xs text-secondary-text">
            {cabecalho.nomeExibicao.length}/{CABECALHO_NOME_MAX_LENGTH}
          </p>
        </div>
      </section>

      {!canUpload ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Configure a Empresa Delivery (slug) em Configurações antes de enviar logo e capa.
        </p>
      ) : null}

      <section>
        <h3 className="text-base font-semibold text-primary">Logo</h3>
        <div className="mt-2">
          <DeliveryImageUploadField
            variant="logo"
            previewUrl={cabecalho.logoUrl}
            helperText="Máx. 5 MB · PNG, JPG ou WebP"
            busy={isUploadingLogo}
            disabled={!canUpload}
            onFileSelected={handleLogoUpload}
            onClearPreview={clearLogo}
          />
        </div>
        <fieldset className="mt-2">
          <legend className="text-sm font-semibold text-primary-text">Forma</legend>
          <div className="mt-1 flex gap-4">
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
                <span className="capitalize text-primary-text">
                  {formato === 'circular' ? 'Circular' : 'Quadrada'}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section>
        <h3 className="text-base font-semibold text-primary">Capa</h3>
        <div className="mt-2 max-w-md">
          <DeliveryImageUploadField
            variant="banner"
            previewUrl={cabecalho.capaUrl}
            helperText="Máx. 5 MB · PNG, JPG ou WebP"
            emptyHint="Arraste e solte a imagem aqui ou Selecionar arquivo"
            busy={isUploadingBanner}
            disabled={!canUpload}
            onFileSelected={handleBannerUpload}
            onClearPreview={clearBanner}
          />
        </div>
      </section>
    </div>
  )
}
