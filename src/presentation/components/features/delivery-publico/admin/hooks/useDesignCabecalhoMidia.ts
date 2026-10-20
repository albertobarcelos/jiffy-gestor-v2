'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import {
  mensagemLegivelDeliveryMediaError,
  uploadEmpresaDeliveryBanner,
  uploadEmpresaDeliveryLogo,
} from '@/src/infrastructure/api/deliveryMediaApi'
import { removerImagemUseCase } from '@/src/presentation/hooks/media/criarImagemMediaUseCases'
import { fetchEmpresaPublicaMidia } from '@/src/infrastructure/api/empresaDeliveryMidiaApi'
import { validateDeliveryImageFile } from '@/src/shared/constants/deliveryImageUpload'
import { showToast } from '@/src/shared/utils/toast'
import type { DeliveryPublicoDesignConfig } from '../../shared/types/deliveryPublicoDesignConfig'

type CabecalhoMidiaField = 'logoUrl' | 'capaUrl'

type UseDesignCabecalhoMidiaOptions = {
  slug?: string
  hasEmpresaDelivery: boolean
  logoUrl: string | null
  capaUrl: string | null
  onChange: (updater: (current: DeliveryPublicoDesignConfig) => DeliveryPublicoDesignConfig) => void
}

function isPersistedImageUrl(url: string | null | undefined): url is string {
  return typeof url === 'string' && url.trim().length > 0 && !url.startsWith('blob:')
}

function revokeBlobUrl(url: string | null | undefined) {
  if (url?.startsWith('blob:')) {
    URL.revokeObjectURL(url)
  }
}

export function useDesignCabecalhoMidia({
  slug,
  hasEmpresaDelivery,
  logoUrl,
  capaUrl,
  onChange,
}: UseDesignCabecalhoMidiaOptions) {
  const { auth } = useAuthStore()
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [isUploadingBanner, setIsUploadingBanner] = useState(false)
  const hydratedSlugRef = useRef<string | null>(null)
  const logoImageIdRef = useRef<string | null>(null)
  const bannerImageIdRef = useRef<string | null>(null)

  const updateCabecalhoField = useCallback(
    (field: CabecalhoMidiaField, url: string | null) => {
      onChange(current => ({
        ...current,
        cabecalho: { ...current.cabecalho, [field]: url },
      }))
    },
    [onChange]
  )

  useEffect(() => {
    const trimmedSlug = slug?.trim()
    if (!trimmedSlug || !hasEmpresaDelivery) return
    if (hydratedSlugRef.current === trimmedSlug) return

    let cancelled = false

    void fetchEmpresaPublicaMidia(trimmedSlug)
      .then(({ logoUrl: apiLogo, bannerUrl: apiBanner }) => {
        if (cancelled) return

        onChange(current => {
          const nextLogo = isPersistedImageUrl(current.cabecalho.logoUrl)
            ? current.cabecalho.logoUrl
            : apiLogo
          const nextCapa = isPersistedImageUrl(current.cabecalho.capaUrl)
            ? current.cabecalho.capaUrl
            : apiBanner

          if (
            nextLogo === current.cabecalho.logoUrl &&
            nextCapa === current.cabecalho.capaUrl
          ) {
            return current
          }

          revokeBlobUrl(current.cabecalho.logoUrl)
          revokeBlobUrl(current.cabecalho.capaUrl)

          return {
            ...current,
            cabecalho: {
              ...current.cabecalho,
              logoUrl: nextLogo,
              capaUrl: nextCapa,
            },
          }
        })

        hydratedSlugRef.current = trimmedSlug
      })
      .catch(() => {
        if (!cancelled) hydratedSlugRef.current = trimmedSlug
      })

    return () => {
      cancelled = true
    }
  }, [slug, hasEmpresaDelivery, onChange])

  const uploadMidia = useCallback(
    async (field: CabecalhoMidiaField, file: File) => {
      const token = auth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado')
        return
      }

      if (!hasEmpresaDelivery) {
        showToast.error('Configure o Delivery antes de enviar imagens.')
        return
      }

      const trimmedSlug = slug?.trim()
      if (!trimmedSlug) {
        showToast.error('Slug da loja não encontrado.')
        return
      }

      const validationError = await validateDeliveryImageFile(file)
      if (validationError) {
        showToast.error(validationError)
        return
      }

      const setUploading = field === 'logoUrl' ? setIsUploadingLogo : setIsUploadingBanner
      const previousUrl = field === 'logoUrl' ? logoUrl : capaUrl
      const preview = URL.createObjectURL(file)

      updateCabecalhoField(field, preview)
      setUploading(true)
      const toastId = showToast.loading(
        field === 'logoUrl' ? 'Enviando logo...' : 'Enviando capa...'
      )

      try {
        const confirmado =
          field === 'logoUrl'
            ? await uploadEmpresaDeliveryLogo(file, token)
            : await uploadEmpresaDeliveryBanner(file, token)
        if (field === 'logoUrl') logoImageIdRef.current = confirmado.imageId
        else bannerImageIdRef.current = confirmado.imageId

        const { logoUrl: apiLogo, bannerUrl: apiBanner } =
          await fetchEmpresaPublicaMidia(trimmedSlug)
        const persistedUrl = field === 'logoUrl' ? apiLogo : apiBanner

        revokeBlobUrl(preview)
        updateCabecalhoField(field, persistedUrl ?? preview)

        showToast.successLoading(
          toastId,
          field === 'logoUrl' ? 'Logo enviado com sucesso!' : 'Capa enviada com sucesso!'
        )
      } catch (error) {
        revokeBlobUrl(preview)
        updateCabecalhoField(field, previousUrl ?? null)
        showToast.errorLoading(toastId, mensagemLegivelDeliveryMediaError(error))
      } finally {
        setUploading(false)
      }
    },
    [auth, hasEmpresaDelivery, slug, logoUrl, capaUrl, updateCabecalhoField]
  )

  const handleLogoUpload = useCallback(
    (file: File) => uploadMidia('logoUrl', file),
    [uploadMidia]
  )

  const handleBannerUpload = useCallback(
    (file: File) => uploadMidia('capaUrl', file),
    [uploadMidia]
  )

  const imageIdDaEmpresa = useCallback(
    async (field: CabecalhoMidiaField, token: string): Promise<string | null> => {
      const atual = field === 'logoUrl' ? logoImageIdRef.current : bannerImageIdRef.current
      if (atual) return atual
      const response = await fetch('/api/delivery/empresas/me', {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      })
      if (!response.ok) return null
      const body = (await response.json().catch(() => null)) as {
        logo?: { imageId?: string | null } | null
        banner?: { imageId?: string | null } | null
      } | null
      const logoId = body?.logo?.imageId?.trim() || null
      const bannerId = body?.banner?.imageId?.trim() || null
      logoImageIdRef.current = logoId
      bannerImageIdRef.current = bannerId
      return field === 'logoUrl' ? logoId : bannerId
    },
    []
  )

  const removerMidia = useCallback(
    async (field: CabecalhoMidiaField, url: string | null) => {
      if (url?.startsWith('blob:') || !isPersistedImageUrl(url)) {
        revokeBlobUrl(url)
        updateCabecalhoField(field, null)
        return
      }
      const token = auth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado')
        return
      }
      const toastId = showToast.loading(field === 'logoUrl' ? 'Removendo logo...' : 'Removendo capa...')
      try {
        const imageId = await imageIdDaEmpresa(field, token)
        if (!imageId) {
          showToast.errorLoading(toastId, 'Não foi possível identificar a imagem para remover.')
          return
        }
        await removerImagemUseCase().execute({ imageId, token })
        if (field === 'logoUrl') logoImageIdRef.current = null
        else bannerImageIdRef.current = null
        updateCabecalhoField(field, null)
        showToast.successLoading(toastId, field === 'logoUrl' ? 'Logo removida.' : 'Capa removida.')
      } catch (error) {
        showToast.errorLoading(toastId, mensagemLegivelDeliveryMediaError(error))
      }
    },
    [auth, imageIdDaEmpresa, updateCabecalhoField]
  )

  const clearLogo = useCallback(() => {
    void removerMidia('logoUrl', logoUrl)
  }, [logoUrl, removerMidia])

  const clearBanner = useCallback(() => {
    void removerMidia('capaUrl', capaUrl)
  }, [capaUrl, removerMidia])

  return {
    isUploadingLogo,
    isUploadingBanner,
    handleLogoUpload,
    handleBannerUpload,
    clearLogo,
    clearBanner,
    canUpload: hasEmpresaDelivery && Boolean(slug?.trim()),
  }
}
