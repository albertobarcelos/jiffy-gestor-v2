'use client'

import { useEffect, useState } from 'react'
import type { DeliveryPublicoDesignConfig } from '../../../shared/types/deliveryPublicoDesignConfig'
import { CABECALHO_NOME_MAX_LENGTH } from '../../../shared/constants/defaultDesignConfig'
import { DeliveryImageUploadField } from '@/src/presentation/components/ui/DeliveryImageUploadField'
import {
  DELIVERY_CAPA_CROP_PRESET,
  DELIVERY_LOGO_CROP_PRESET,
} from '@/src/presentation/constants/imageCropPresets'
import {
  useAtualizarEmpresaDelivery,
} from '@/src/presentation/hooks/useEmpresaDeliveryMe'
import { showToast } from '@/src/shared/utils/toast'
import { useDesignCabecalhoMidia } from '../../hooks/useDesignCabecalhoMidia'

type DesignCabecalhoTabProps = {
  config: DeliveryPublicoDesignConfig
  slug?: string
  hasEmpresaDelivery: boolean
  /** Nome fantasia cadastral (fallback quando nomeExibicao da delivery é null). */
  nomeFantasiaFallback: string
  /** Valor persistido em empresa_delivery.nome_exibicao (null = usa fantasia). */
  nomeExibicaoDelivery: string | null
  onChange: (updater: (current: DeliveryPublicoDesignConfig) => DeliveryPublicoDesignConfig) => void
}

function resolveNomeExibido(
  nomeExibicaoDelivery: string | null | undefined,
  nomeFantasiaFallback: string
): string {
  const custom = (nomeExibicaoDelivery ?? '').trim()
  const fallback = nomeFantasiaFallback.trim()
  return (custom || fallback).slice(0, CABECALHO_NOME_MAX_LENGTH)
}

export function DesignCabecalhoTab({
  config,
  slug,
  hasEmpresaDelivery,
  nomeFantasiaFallback,
  nomeExibicaoDelivery,
  onChange,
}: DesignCabecalhoTabProps) {
  const { cabecalho } = config
  const atualizarEmpresaDelivery = useAtualizarEmpresaDelivery()

  const nomeResolvido = resolveNomeExibido(nomeExibicaoDelivery, nomeFantasiaFallback)
  const [nomeInput, setNomeInput] = useState(nomeResolvido)

  useEffect(() => {
    setNomeInput(nomeResolvido)
  }, [nomeResolvido])

  useEffect(() => {
    if (cabecalho.nomeExibicao === nomeResolvido) return
    onChange(current => ({
      ...current,
      cabecalho: {
        ...current.cabecalho,
        nomeExibicao: nomeResolvido,
      },
    }))
  }, [nomeResolvido, cabecalho.nomeExibicao, onChange])

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

  const handleNomeBlur = async () => {
    if (!hasEmpresaDelivery || atualizarEmpresaDelivery.isPending) return

    const trimmed = nomeInput.trim().slice(0, CABECALHO_NOME_MAX_LENGTH)
    const fantasia = nomeFantasiaFallback.trim()
    const atualCustom = (nomeExibicaoDelivery ?? '').trim()

    // Vazio → limpa custom e volta ao fallback fantasia.
    const nextCustom: string | null =
      trimmed.length === 0 || trimmed === fantasia ? null : trimmed

    const nextResolved = resolveNomeExibido(nextCustom, fantasia)
    setNomeInput(nextResolved)

    if ((nextCustom ?? '') === atualCustom) {
      return
    }

    try {
      await atualizarEmpresaDelivery.mutateAsync({ nomeExibicao: nextCustom })
      onChange(current => ({
        ...current,
        cabecalho: {
          ...current.cabecalho,
          nomeExibicao: nextResolved,
        },
      }))
      showToast.success(
        nextCustom
          ? 'Nome do negócio atualizado.'
          : 'Nome do negócio restaurado para o nome fantasia.'
      )
    } catch (error) {
      setNomeInput(nomeResolvido)
      const msg =
        error instanceof Error
          ? error.message
          : 'Não foi possível salvar o nome do negócio.'
      showToast.error(msg)
    }
  }

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
            value={nomeInput}
            disabled={!hasEmpresaDelivery || atualizarEmpresaDelivery.isPending}
            onChange={event =>
              setNomeInput(event.target.value.slice(0, CABECALHO_NOME_MAX_LENGTH))
            }
            onBlur={() => {
              void handleNomeBlur()
            }}
            title="Nome exibido no cardápio público (não altera o nome fantasia da empresa)"
            className="mt-1 w-full max-w-md rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-primary-text outline-none focus:border-secondary focus:ring-1 focus:ring-secondary disabled:cursor-not-allowed disabled:bg-gray-50"
          />
          <p className="mt-0.5 text-xs text-secondary-text">
            Aparece só no cardápio delivery. Em branco, usa o nome fantasia
            {fantasiaHint(nomeFantasiaFallback)}. Salva ao sair do campo.
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
            helperText="Após escolher o arquivo, ajuste o recorte (máx. 1200×300 · 4:1). Mantenha o foco no centro. JPEG, PNG ou WebP até 1 MB."
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

function fantasiaHint(nomeFantasiaFallback: string): string {
  const trimmed = nomeFantasiaFallback.trim()
  return trimmed ? ` (“${trimmed}”).` : '.'
}
