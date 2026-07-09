'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { fetchEmpresaPublicaMidia } from '@/src/infrastructure/api/publicDeliveryApi'
import {
  mensagemLegivelDeliveryMediaError,
  uploadEmpresaDeliveryBanner,
  uploadEmpresaDeliveryLogo,
} from '@/src/infrastructure/api/deliveryMediaApi'
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
        showToast.error('Configure a Empresa Delivery antes de enviar imagens.')
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
        if (field === 'logoUrl') {
          await uploadEmpresaDeliveryLogo(file, token)
        } else {
          await uploadEmpresaDeliveryBanner(file, token)
        }

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

  const clearLogo = useCallback(() => {
    revokeBlobUrl(logoUrl)
    updateCabecalhoField('logoUrl', null)
  }, [logoUrl, updateCabecalhoField])

  const clearBanner = useCallback(() => {
    revokeBlobUrl(capaUrl)
    updateCabecalhoField('capaUrl', null)
  }, [capaUrl, updateCabecalhoField])

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
