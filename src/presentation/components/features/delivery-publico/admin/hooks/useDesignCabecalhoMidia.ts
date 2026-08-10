'use client'

import { useCallback, useState } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { fetchEmpresaPublicaMidia } from '@/src/infrastructure/api/publicDeliveryApi'
import {
  clearEmpresaDeliveryBanner,
  clearEmpresaDeliveryLogo,
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
  const [isClearingLogo, setIsClearingLogo] = useState(false)
  const [isClearingBanner, setIsClearingBanner] = useState(false)

  const updateCabecalhoField = useCallback(
    (field: CabecalhoMidiaField, url: string | null) => {
      onChange(current => ({
        ...current,
        cabecalho: { ...current.cabecalho, [field]: url },
      }))
    },
    [onChange]
  )

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

  const clearMidia = useCallback(
    async (field: CabecalhoMidiaField) => {
      const token = auth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado')
        return
      }

      if (!hasEmpresaDelivery) {
        showToast.error('Configure a Empresa Delivery antes de remover imagens.')
        return
      }

      const previousUrl = field === 'logoUrl' ? logoUrl : capaUrl
      const setClearing = field === 'logoUrl' ? setIsClearingLogo : setIsClearingBanner
      setClearing(true)
      const toastId = showToast.loading(
        field === 'logoUrl' ? 'Removendo logo...' : 'Removendo capa...'
      )

      try {
        if (field === 'logoUrl') {
          await clearEmpresaDeliveryLogo(token)
        } else {
          await clearEmpresaDeliveryBanner(token)
        }
        revokeBlobUrl(previousUrl)
        updateCabecalhoField(field, null)
        showToast.successLoading(
          toastId,
          field === 'logoUrl' ? 'Logo removido.' : 'Capa removida.'
        )
      } catch (error) {
        showToast.errorLoading(toastId, mensagemLegivelDeliveryMediaError(error))
      } finally {
        setClearing(false)
      }
    },
    [auth, hasEmpresaDelivery, logoUrl, capaUrl, updateCabecalhoField]
  )

  const clearLogo = useCallback(() => clearMidia('logoUrl'), [clearMidia])
  const clearBanner = useCallback(() => clearMidia('capaUrl'), [clearMidia])

  return {
    isUploadingLogo: isUploadingLogo || isClearingLogo,
    isUploadingBanner: isUploadingBanner || isClearingBanner,
    handleLogoUpload,
    handleBannerUpload,
    clearLogo,
    clearBanner,
    canUpload: hasEmpresaDelivery && Boolean(slug?.trim()),
  }
}
