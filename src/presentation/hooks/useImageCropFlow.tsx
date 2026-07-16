'use client'

import { useCallback, useEffect, useState } from 'react'
import { ImageCropModal } from '@/src/presentation/components/ui/ImageCropModal'
import type { ImageCropPreset } from '@/src/presentation/utils/imageCrop'
import { validateImageCropSourceFile } from '@/src/presentation/utils/imageCrop'
import { showToast } from '@/src/shared/utils/toast'

type UseImageCropFlowOptions = {
  preset: ImageCropPreset
  /** Chamado com o ficheiro já recortado. */
  onCropped: (file: File) => void | Promise<void>
}

/**
 * Fluxo: ficheiro original → modal de crop → callback com File de saída.
 */
export function useImageCropFlow({ preset, onCropped }: UseImageCropFlowOptions) {
  const [open, setOpen] = useState(false)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [sourceMimeType, setSourceMimeType] = useState<string | undefined>()
  const [sourceFileName, setSourceFileName] = useState<string | undefined>()

  useEffect(() => {
    return () => {
      if (imageSrc) URL.revokeObjectURL(imageSrc)
    }
  }, [imageSrc])

  const close = useCallback(() => {
    setOpen(false)
    setSourceMimeType(undefined)
    setSourceFileName(undefined)
    setImageSrc(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }, [])

  const openWithFile = useCallback(
    (file: File): boolean => {
      const error = validateImageCropSourceFile(file, preset)
      if (error) {
        showToast.error(error)
        return false
      }

      setSourceMimeType(file.type || undefined)
      setSourceFileName(file.name || undefined)
      setImageSrc(prev => {
        if (prev) URL.revokeObjectURL(prev)
        return URL.createObjectURL(file)
      })
      setOpen(true)
      return true
    },
    [preset]
  )

  const handleConfirm = useCallback(
    (file: File) => {
      close()
      void onCropped(file)
    },
    [close, onCropped]
  )

  const cropModal = (
    <ImageCropModal
      open={open}
      imageSrc={imageSrc}
      sourceMimeType={sourceMimeType}
      sourceFileName={sourceFileName}
      preset={preset}
      onClose={close}
      onConfirm={handleConfirm}
    />
  )

  return {
    openWithFile,
    cropModal,
    isCropOpen: open,
  }
}
