'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { MdImage, MdLink, MdShare, MdStorefront, type IconType } from 'react-icons/md'
import type { DeliveryPublicoDesignConfig } from '../../../shared/types/deliveryPublicoDesignConfig'
import { DeliveryImageUploadField } from '@/src/presentation/components/ui/DeliveryImageUploadField'
import {
  DELIVERY_CAPA_CROP_PRESET,
  DELIVERY_LOGO_CROP_PRESET,
} from '@/src/presentation/constants/imageCropPresets'
import { useDesignCabecalhoMidia } from '../../hooks/useDesignCabecalhoMidia'
import {
  useAtualizarEmpresaDelivery,
  useCriarEmpresaDelivery,
  useEmpresaDeliveryMe,
} from '@/src/presentation/hooks/useEmpresaDeliveryMe'
import { useEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import {
  normalizeDeliverySlug,
  validateDeliverySlug,
} from '@/src/shared/utils/slugDelivery'
import {
  buildCardapioLojaUrl,
  getCardapioSlugInputPrefix,
} from '@/src/shared/utils/cardapioPublicUrl'
import { compartilharLinkDelivery } from '../../../shared/utils/compartilharProdutoDelivery'
import { showToast } from '@/src/shared/utils/toast'

type DesignCabecalhoTabProps = {
  config: DeliveryPublicoDesignConfig
  slug?: string
  hasEmpresaDelivery: boolean
  onChange: (updater: (current: DeliveryPublicoDesignConfig) => DeliveryPublicoDesignConfig) => void
}

function CabecalhoOpcaoCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: IconType
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="flex overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex w-24 shrink-0 items-center justify-center bg-alternate/20 text-alternate sm:w-28">
        <Icon className="h-10 w-10 sm:h-12 sm:w-12" aria-hidden />
      </div>
      <div className="min-w-0 flex-1 space-y-3 p-4 md:p-5">
        <div>
          <h2 className="text-base font-bold text-primary-text">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-sm text-secondary-text">{description}</p>
          ) : null}
        </div>
        {children}
      </div>
    </section>
  )
}

export function DesignCabecalhoTab({
  config,
  slug: slugProp,
  hasEmpresaDelivery,
  onChange,
}: DesignCabecalhoTabProps) {
  const { cabecalho } = config
  const slugInputPrefix = getCardapioSlugInputPrefix()
  const { empresa } = useEmpresaMe()
  const empresaDeliveryQuery = useEmpresaDeliveryMe()
  const criarMutation = useCriarEmpresaDelivery()
  const atualizarMutation = useAtualizarEmpresaDelivery()

  const [slug, setSlug] = useState('')
  const [slugErro, setSlugErro] = useState<string | null>(null)
  const slugHidratadoRef = useRef(false)

  const empresaDelivery = empresaDeliveryQuery.data
  const configurado = empresaDelivery != null
  const salvandoSlug = criarMutation.isPending || atualizarMutation.isPending

  const {
    isUploadingLogo,
    isUploadingBanner,
    handleLogoUpload,
    handleBannerUpload,
    clearLogo,
    clearBanner,
    canUpload,
  } = useDesignCabecalhoMidia({
    slug: slugProp,
    hasEmpresaDelivery,
    logoUrl: cabecalho.logoUrl,
    capaUrl: cabecalho.capaUrl,
    onChange,
  })

  useEffect(() => {
    if (slugHidratadoRef.current || empresaDeliveryQuery.isPending) return

    if (empresaDelivery?.slug) {
      slugHidratadoRef.current = true
      setSlug(empresaDelivery.slug)
      return
    }

    if (empresaDeliveryQuery.isSuccess && !empresaDelivery) {
      slugHidratadoRef.current = true
      const sugestao = empresa?.nomeExibicao
        ? normalizeDeliverySlug(empresa.nomeExibicao)
        : ''
      if (sugestao.length >= 3) setSlug(sugestao)
    }
  }, [
    empresa?.nomeExibicao,
    empresaDelivery,
    empresaDeliveryQuery.isPending,
    empresaDeliveryQuery.isSuccess,
  ])

  const handleSlugBlur = useCallback(() => {
    const normalizado = normalizeDeliverySlug(slug)
    setSlug(normalizado)
    setSlugErro(validateDeliverySlug(normalizado))
  }, [slug])

  const handleCompartilharLink = useCallback(async () => {
    const slugNormalizado = normalizeDeliverySlug(slug)
    const erroSlug = validateDeliverySlug(slugNormalizado)
    if (erroSlug) {
      setSlugErro(erroSlug)
      showToast.error(erroSlug)
      return
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : undefined
    const url = buildCardapioLojaUrl(slugNormalizado, origin)
    if (!url) {
      showToast.error('Informe o link da loja para compartilhar.')
      return
    }

    const nomeLoja = empresa?.nomeExibicao?.trim()
    await compartilharLinkDelivery({
      title: nomeLoja ? `Cardápio — ${nomeLoja}` : 'Cardápio da loja',
      text: nomeLoja
        ? `Peça pelo cardápio da ${nomeLoja}`
        : 'Peça pelo nosso cardápio',
      url,
    })
  }, [empresa?.nomeExibicao, slug])

  const handleSalvarSlug = useCallback(async () => {
    const slugNormalizado = normalizeDeliverySlug(slug)
    const erroSlug = validateDeliverySlug(slugNormalizado)
    if (erroSlug) {
      setSlugErro(erroSlug)
      showToast.error(erroSlug)
      return
    }

    try {
      if (configurado) {
        await atualizarMutation.mutateAsync({ slug: slugNormalizado })
        showToast.success('Link da loja atualizado.')
      } else {
        await criarMutation.mutateAsync({ slug: slugNormalizado })
        slugHidratadoRef.current = false
        showToast.success('Delivery ativado! Agora escolha o cardápio na seção Cardápio.')
      }
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Não foi possível salvar o link.'
      showToast.error(msg)
    }
  }, [atualizarMutation, configurado, criarMutation, slug])

  const slugSalvo = empresaDelivery?.slug ?? ''
  const slugDirty =
    normalizeDeliverySlug(slug) !== normalizeDeliverySlug(slugSalvo)

  return (
    <div className="space-y-4">
      <CabecalhoOpcaoCard
        icon={MdLink}
        title="Link público da loja"
        description="Apenas letras minúsculas, números e hífens (mínimo 3 caracteres)."
      >
        <div className="flex min-w-0 flex-1 items-center rounded-lg border border-gray-200 bg-gray-50">
          <span className="shrink-0 pl-3 text-sm text-secondary-text">
            {slugInputPrefix}
          </span>
          <input
            id="design-cabecalho-slug"
            type="text"
            value={slug}
            disabled={salvandoSlug}
            onChange={e => {
              setSlug(e.target.value.toLowerCase())
              setSlugErro(null)
            }}
            onBlur={handleSlugBlur}
            placeholder="minha-loja"
            className="h-10 min-w-0 flex-1 rounded-r-lg bg-transparent px-2 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>
        {slugErro ? <p className="text-xs text-red-600">{slugErro}</p> : null}
        {!configurado ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Defina o slug e clique em &quot;Ativar Delivery&quot; para publicar o link da loja.
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleCompartilharLink()}
            disabled={salvandoSlug || !normalizeDeliverySlug(slug)}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-alternate/30 bg-alternate/10 px-4 text-sm font-semibold text-alternate transition-colors hover:bg-alternate/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <MdShare className="h-4 w-4" aria-hidden />
            Compartilhar link
          </button>
          {!configurado || slugDirty ? (
            <button
              type="button"
              onClick={() => void handleSalvarSlug()}
              disabled={salvandoSlug}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-secondary px-4 text-sm font-semibold text-white transition-colors hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {salvandoSlug
                ? 'Salvando...'
                : configurado
                  ? 'Salvar link'
                  : 'Ativar Delivery'}
            </button>
          ) : null}
        </div>
      </CabecalhoOpcaoCard>

      <CabecalhoOpcaoCard
        icon={MdStorefront}
        title="Nome da sua Loja Delivery"
        description="Nome fantasia da empresa, conforme cadastro (até 20 caracteres no cabeçalho)."
      >
        <input
          id="design-nome-negocio"
          type="text"
          readOnly
          aria-readonly="true"
          value={cabecalho.nomeExibicao}
          title="Nome vindo do cadastro da empresa"
          className="w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-primary-text outline-none"
        />
      </CabecalhoOpcaoCard>

      {!canUpload ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Ative o Delivery no card de link acima antes de enviar logo e capa.
        </p>
      ) : null}

      <CabecalhoOpcaoCard
        icon={MdImage}
        title="Logo e capa"
        description="Imagens do cabeçalho no cardápio público."
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="shrink-0 space-y-2">
            <h3 className="text-sm font-semibold text-primary-text">Logo</h3>
            <DeliveryImageUploadField
              variant="logo"
              compact
              dropzoneHeight={112}
              previewUrl={cabecalho.logoUrl}
              cropPreset={DELIVERY_LOGO_CROP_PRESET}
              helperText="Recorte máx. 500×500. JPEG, PNG ou WebP até 1 MB."
              busy={isUploadingLogo}
              disabled={!canUpload}
              onFileSelected={handleLogoUpload}
              onClearPreview={clearLogo}
            />
            <fieldset>
              <legend className="text-sm font-semibold text-primary-text">Forma</legend>
              <div className="mt-1 flex flex-col gap-1.5 sm:flex-row sm:gap-3">
                {(['circular', 'quadrada'] as const).map(formato => (
                  <label
                    key={formato}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
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
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <h3 className="text-sm font-semibold text-primary-text">Capa</h3>
            <DeliveryImageUploadField
              variant="banner"
              dropzoneHeight={112}
              previewUrl={cabecalho.capaUrl}
              cropPreset={DELIVERY_CAPA_CROP_PRESET}
              helperText="Recorte máx. 1200×300 · 4:1. Foque o centro. JPEG, PNG ou WebP até 1 MB."
              emptyHint="Arraste e solte a imagem aqui ou Selecionar arquivo"
              busy={isUploadingBanner}
              disabled={!canUpload}
              onFileSelected={handleBannerUpload}
              onClearPreview={clearBanner}
            />
          </div>
        </div>
      </CabecalhoOpcaoCard>
    </div>
  )
}
