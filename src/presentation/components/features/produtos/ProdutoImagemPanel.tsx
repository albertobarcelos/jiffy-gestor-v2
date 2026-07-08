'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { DeliveryImageUploadField } from '@/src/presentation/components/ui/DeliveryImageUploadField'
import { validateDeliveryImageFile } from '@/src/shared/constants/deliveryImageUpload'
import {
  fetchProdutoImagemUrl,
  mensagemLegivelDeliveryMediaError,
  uploadProdutoImagem,
} from '@/src/infrastructure/api/deliveryMediaApi'
import { showToast } from '@/src/shared/utils/toast'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'

interface ProdutoImagemPanelProps {
  open: boolean
  produtoId?: string
  produtoNome?: string
  onReload?: () => void
}

export function ProdutoImagemPanel({
  open,
  produtoId,
  produtoNome,
  onReload,
}: ProdutoImagemPanelProps) {
  const { auth } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [serverUrl, setServerUrl] = useState<string | null>(null)
  const loadedProdutoIdRef = useRef<string | null>(null)

  const applyImagemUrl = useCallback((url: string | null) => {
    setServerUrl(url)
    setPreviewUrl(prev => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
      return url
    })
  }, [])

  useEffect(() => {
    if (!open || !produtoId) {
      loadedProdutoIdRef.current = null
      return
    }

    if (loadedProdutoIdRef.current === produtoId) return

    const token = auth?.getAccessToken()
    if (!token) return

    let cancelled = false
    setIsLoading(true)

    void fetchProdutoImagemUrl(produtoId, token)
      .then(url => {
        if (cancelled) return
        applyImagemUrl(url)
        loadedProdutoIdRef.current = produtoId
      })
      .catch(() => {
        if (cancelled) return
        applyImagemUrl(null)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, produtoId, auth, applyImagemUrl])

  const handleImagemUpload = useCallback(
    async (file: File) => {
      const token = auth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado')
        return
      }
      if (!produtoId) {
        showToast.error('Salve o produto antes de enviar uma imagem.')
        return
      }

      const validationError = validateDeliveryImageFile(file)
      if (validationError) {
        showToast.error(validationError)
        return
      }

      const preview = URL.createObjectURL(file)
      setPreviewUrl(prev => {
        if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
        return preview
      })

      setIsUploading(true)
      const toastId = showToast.loading('Enviando imagem...')

      try {
        await uploadProdutoImagem(produtoId, file, token)
        const persistedUrl = await fetchProdutoImagemUrl(produtoId, token)
        applyImagemUrl(persistedUrl ?? preview)
        showToast.successLoading(toastId, 'Imagem enviada com sucesso!')
        onReload?.()
      } catch (error) {
        setPreviewUrl(prev => {
          if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
          return serverUrl
        })
        showToast.errorLoading(toastId, mensagemLegivelDeliveryMediaError(error))
      } finally {
        setIsUploading(false)
      }
    },
    [auth, produtoId, applyImagemUrl, serverUrl, onReload]
  )

  const handleClearPreview = useCallback(() => {
    setPreviewUrl(prev => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
      return serverUrl
    })
  }, [serverUrl])

  if (!produtoId) {
    return (
      <div className="flex h-full min-h-0 flex-1 items-center justify-center px-4 text-center text-sm text-secondary-text">
        Salve o produto para habilitar o envio de imagem.
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-full min-h-0 flex-1 items-center justify-center">
        <JiffyLoading />
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 sm:px-6">
      <div className="mx-auto w-full max-w-lg space-y-4">
        <div>
          <h2 className="text-base font-semibold text-primary-text">Imagem do produto</h2>
          <p className="mt-1 text-sm text-secondary-text">
            {produtoNome
              ? `A imagem de "${produtoNome}" aparece no cardápio digital público após o upload.`
              : 'A imagem aparece no cardápio digital público após o upload.'}
          </p>
        </div>

        <DeliveryImageUploadField
          label="Imagem (cardápio digital)"
          busy={isUploading}
          previewUrl={previewUrl}
          helperText="Formatos aceitos: JPEG, PNG ou WebP. Tamanho máximo: 5 MB."
          emptyHint="Arraste uma imagem ou clique para selecionar"
          onFileSelected={handleImagemUpload}
          onClearPreview={
            previewUrl?.startsWith('blob:') && previewUrl !== serverUrl
              ? handleClearPreview
              : undefined
          }
        />
      </div>
    </div>
  )
}
