'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Cropper, { type MediaSize } from 'react-easy-crop'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/src/presentation/components/ui/dialog'
import {
  clampCropFrameSize,
  cropImageWithPreset,
  estimateOutputSizeFromCropFrame,
  getCropNaturalArea,
  getInitialCropFrameSize,
  type CropFrameSize,
  type ImageCropPreset,
} from '@/src/presentation/utils/imageCrop'
import { showToast } from '@/src/shared/utils/toast'
import { ImageCropFrameHandles } from './ImageCropFrameHandles'
import { getCropContainerStyle, useMaxCropFrameSize } from './useImageCropDisplaySize'

const CROP_MIN_ZOOM = 0.25
const CROP_MAX_ZOOM = 3

export type ImageCropModalProps = {
  open: boolean
  imageSrc: string | null
  preset: ImageCropPreset
  /** MIME do ficheiro original — usado quando preset.preserveSourceMimeType. */
  sourceMimeType?: string
  sourceFileName?: string
  onClose: () => void
  onConfirm: (file: File) => void
}

export function ImageCropModal({
  open,
  imageSrc,
  preset,
  sourceMimeType,
  sourceFileName,
  onClose,
  onConfirm,
}: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [cropFrameSize, setCropFrameSize] = useState<CropFrameSize>({
    width: preset.displayFrameWidth,
    height: preset.displayFrameHeight,
  })
  const [cropAreaReady, setCropAreaReady] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [outputSizeLabel, setOutputSizeLabel] = useState<string | null>(null)
  const cropContainerRef = useRef<HTMLDivElement>(null)
  const maxCropFrameSize = useMaxCropFrameSize(cropContainerRef, open && !!imageSrc, preset)
  const mediaSizeRef = useRef<MediaSize | null>(null)

  useEffect(() => {
    if (!open) {
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setCropAreaReady(false)
      setIsApplying(false)
      setOutputSizeLabel(null)
      mediaSizeRef.current = null
      return
    }
  }, [open, imageSrc])

  useEffect(() => {
    if (!open || !imageSrc) return
    setCropFrameSize({
      width: preset.displayFrameWidth,
      height: preset.displayFrameHeight,
    })
  }, [open, imageSrc, preset.displayFrameWidth, preset.displayFrameHeight])

  useEffect(() => {
    setCropFrameSize(prev => clampCropFrameSize(prev, maxCropFrameSize, preset))
  }, [maxCropFrameSize.width, maxCropFrameSize.height, preset])

  const refreshOutputLabel = useCallback(() => {
    const media = mediaSizeRef.current
    if (!media) {
      setOutputSizeLabel(null)
      return
    }
    const { width, height } = estimateOutputSizeFromCropFrame(
      crop,
      media,
      cropFrameSize,
      zoom,
      preset
    )
    setOutputSizeLabel(`${width} × ${height} px`)
  }, [crop, cropFrameSize, zoom, preset])

  useEffect(() => {
    if (!open || !imageSrc || !mediaSizeRef.current) return
    refreshOutputLabel()
  }, [open, imageSrc, crop, cropFrameSize, zoom, refreshOutputLabel])

  const handleMediaLoaded = useCallback(
    (media: MediaSize) => {
      mediaSizeRef.current = media
      setCropFrameSize(getInitialCropFrameSize(media, maxCropFrameSize, preset))
      setCrop({ x: 0, y: 0 })
      setCropAreaReady(true)
    },
    [maxCropFrameSize, preset]
  )

  const handleApply = async () => {
    const media = mediaSizeRef.current
    if (!imageSrc || !media) return
    setIsApplying(true)
    try {
      const naturalArea = getCropNaturalArea(crop, media, cropFrameSize, zoom)
      const file = await cropImageWithPreset(imageSrc, cropFrameSize, naturalArea, preset, {
        sourceMimeType,
        sourceFileName,
      })
      onConfirm(file)
    } catch (e) {
      console.error('Erro ao recortar imagem:', e)
      showToast.error('Não foi possível preparar a imagem. Tente outro arquivo.')
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (!next && !isApplying) onClose()
      }}
      maxWidth="sm"
      fullWidth
    >
      <DialogHeader>
        <DialogTitle>{preset.title}</DialogTitle>
        <DialogDescription className="space-y-1">
          {preset.descriptionLines.map(line => (
            <span key={line} className="block">
              - {line}
            </span>
          ))}
        </DialogDescription>
      </DialogHeader>

      <DialogContent sx={{ overflow: 'hidden' }}>
        <div
          ref={cropContainerRef}
          className="relative mx-auto overflow-hidden rounded-lg bg-primary"
          style={getCropContainerStyle(preset)}
        >
          {imageSrc ? (
            <>
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                minZoom={CROP_MIN_ZOOM}
                maxZoom={CROP_MAX_ZOOM}
                cropSize={cropFrameSize}
                aspect={
                  preset.lockAspectRatio
                    ? preset.maxOutputWidth / preset.maxOutputHeight
                    : undefined
                }
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onMediaLoaded={handleMediaLoaded}
                onCropAreaChange={() => setCropAreaReady(true)}
                onCropComplete={() => setCropAreaReady(true)}
                objectFit="contain"
                showGrid
                style={{
                  containerStyle: {
                    backgroundColor: 'var(--color-primary)',
                  },
                  cropAreaStyle: {
                    border: 'none',
                    boxShadow: 'none',
                  },
                }}
              />
              <ImageCropFrameHandles
                size={cropFrameSize}
                maxSize={maxCropFrameSize}
                preset={preset}
                onSizeChange={setCropFrameSize}
                disabled={isApplying}
              />
            </>
          ) : null}
        </div>
        {outputSizeLabel ? (
          <p className="mt-2 text-center font-nunito text-[10px] text-secondary-text">
            Tamanho estimado do recorte:{' '}
            <span className="font-semibold">{outputSizeLabel}</span>
          </p>
        ) : null}

        <div className="mt-4">
          <div className="flex items-center gap-3">
            <span className="w-28 shrink-0 font-nunito text-xs text-secondary-text">Zoom</span>
            <input
              type="range"
              min={CROP_MIN_ZOOM}
              max={CROP_MAX_ZOOM}
              step={0.05}
              value={zoom}
              onChange={e => setZoom(Number(e.target.value))}
              className="h-2 min-w-0 flex-1 cursor-pointer accent-[var(--color-primary)]"
              aria-label="Zoom da imagem"
            />
          </div>
        </div>
      </DialogContent>

      <DialogFooter>
        <button
          type="button"
          onClick={onClose}
          disabled={isApplying}
          className="h-9 rounded-lg border border-primary bg-primary/10 px-4 font-exo text-sm font-medium text-primary hover:bg-primary/15 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => void handleApply()}
          disabled={isApplying || !imageSrc || !cropAreaReady}
          className="h-9 rounded-lg bg-primary px-4 font-exo text-sm font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isApplying ? 'A processar…' : 'Aplicar'}
        </button>
      </DialogFooter>
    </Dialog>
  )
}
