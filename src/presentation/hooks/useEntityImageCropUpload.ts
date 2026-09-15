'use client'

import { useCallback, useRef } from 'react'
import { useImageCropFlow } from '@/src/presentation/hooks/useImageCropFlow'
import type { ImageCropPreset } from '@/src/presentation/utils/imageCrop'

type UseEntityImageCropUploadOptions = {
  preset: ImageCropPreset
  upload: (entityId: string, file: File) => void | Promise<void>
}

/**
 * Associa o crop a um entityId escolhido na lista e faz upload após Aplicar.
 */
export function useEntityImageCropUpload({
  preset,
  upload,
}: UseEntityImageCropUploadOptions) {
  const pendingIdRef = useRef<string | null>(null)
  const uploadRef = useRef(upload)
  uploadRef.current = upload

  const { openWithFile, cropModal } = useImageCropFlow({
    preset,
    onCropped: async file => {
      const entityId = pendingIdRef.current
      pendingIdRef.current = null
      if (!entityId) return
      await uploadRef.current(entityId, file)
    },
  })

  const selectForEntity = useCallback(
    (entityId: string, file: File) => {
      pendingIdRef.current = entityId
      const ok = openWithFile(file)
      if (!ok) pendingIdRef.current = null
    },
    [openWithFile]
  )

  return { selectForEntity, cropModal }
}
