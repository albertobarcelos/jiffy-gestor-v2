'use client'

import type { DeliveryPublicoDesignConfig } from '../../../shared/types/deliveryPublicoDesignConfig'
import { DeliveryImageUploadField } from '@/src/presentation/components/ui/DeliveryImageUploadField'
import {
  DELIVERY_CAPA_CROP_PRESET,
  DELIVERY_LOGO_CROP_PRESET,
} from '@/src/presentation/constants/imageCropPresets'
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
            readOnly
            aria-readonly="true"
            value={cabecalho.nomeExibicao}
            title="Nome vindo do cadastro da empresa"
            className="mt-1 w-full max-w-md cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-primary-text outline-none"
          />
          <p className="mt-0.5 text-xs text-secondary-text">
            Nome fantasia da empresa, conforme cadastro.
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
            cropPreset={DELIVERY_LOGO_CROP_PRESET}
            helperText="Após escolher o arquivo, ajuste o recorte (máx. 500×500). JPEG, PNG ou WebP até 1 MB."
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
            cropPreset={DELIVERY_CAPA_CROP_PRESET}
            helperText="Após escolher o arquivo, ajuste o recorte (máx. 1200×400 · 3:1). Mantenha o foco no centro. JPEG, PNG ou WebP até 1 MB."
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
