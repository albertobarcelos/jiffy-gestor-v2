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
  LOGO_IMPRESSAO_HEIGHT,
  LOGO_IMPRESSAO_WIDTH,
  clampCropFrameSize,
  cropImageToLogoImpressao,
  estimateOutputSizeFromCropFrame,
  getLogoCropNaturalArea,
  LOGO_CROP_DISPLAY_HEIGHT,
  LOGO_CROP_DISPLAY_WIDTH,
  type CropFrameSize,
} from '@/src/presentation/utils/logoImpressaoCrop'
import { showToast } from '@/src/shared/utils/toast'
import { LogoCropFrameHandles } from './LogoCropFrameHandles'
import {
  logoCropContainerStyle,
  useMaxCropFrameSize,
} from './useLogoCropDisplaySize'

/** Zoom menor que 1 = afastar; maior que 1 = aproximar. */
const LOGO_CROP_MIN_ZOOM = 0.25
const LOGO_CROP_MAX_ZOOM = 3

interface LogoImpressaoCropModalProps {
  open: boolean
  imageSrc: string | null
  onClose: () => void
  onConfirm: (file: File) => void
}

export function LogoImpressaoCropModal({
  open,
  imageSrc,
  onClose,
  onConfirm,
}: LogoImpressaoCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [cropFrameSize, setCropFrameSize] = useState<CropFrameSize>({
    width: LOGO_CROP_DISPLAY_WIDTH,
    height: LOGO_CROP_DISPLAY_HEIGHT,
  })
  const [cropAreaReady, setCropAreaReady] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [outputSizeLabel, setOutputSizeLabel] = useState<string | null>(null)
  const cropContainerRef = useRef<HTMLDivElement>(null)
  const maxCropFrameSize = useMaxCropFrameSize(cropContainerRef, open && !!imageSrc)
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
    setCropFrameSize(maxCropFrameSize)
  }, [open, imageSrc, maxCropFrameSize.width, maxCropFrameSize.height])

  useEffect(() => {
    setCropFrameSize(prev => clampCropFrameSize(prev, maxCropFrameSize))
  }, [maxCropFrameSize.width, maxCropFrameSize.height])

  const refreshOutputLabel = useCallback(() => {
    const media = mediaSizeRef.current
    if (!media) {
      setOutputSizeLabel(null)
      return
    }
    const { width, height } = estimateOutputSizeFromCropFrame(crop, media, cropFrameSize, zoom)
    const capped =
      width >= LOGO_IMPRESSAO_WIDTH || height >= LOGO_IMPRESSAO_HEIGHT
        ? ` (limite ${LOGO_IMPRESSAO_WIDTH}×${LOGO_IMPRESSAO_HEIGHT} ao salvar)`
        : ''
    setOutputSizeLabel(`${width} × ${height} px${capped}`)
  }, [crop, cropFrameSize, zoom])

  useEffect(() => {
    if (!open || !imageSrc || !mediaSizeRef.current) return
    refreshOutputLabel()
  }, [open, imageSrc, crop, cropFrameSize, zoom, refreshOutputLabel])

  const handleMediaLoaded = useCallback(
    (media: MediaSize) => {
      mediaSizeRef.current = media
      setCropAreaReady(true)
      refreshOutputLabel()
    },
    [refreshOutputLabel]
  )

  const handleApply = async () => {
    const media = mediaSizeRef.current
    if (!imageSrc || !media) return
    setIsApplying(true)
    try {
      const naturalArea = getLogoCropNaturalArea(crop, media, cropFrameSize, zoom)
      const file = await cropImageToLogoImpressao(imageSrc, cropFrameSize, naturalArea)
      onConfirm(file)
    } catch (e) {
      console.error('Erro ao recortar logo:', e)
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
        <DialogTitle>Ajustar logo de impressão</DialogTitle>
        <DialogDescription>
          - Arraste a imagem (zoom abaixo) e redimensione a moldura pelas bordas e cantos.
          <p>
            - Largura e altura do recorte são independentes (até {LOGO_IMPRESSAO_WIDTH}×
            {LOGO_IMPRESSAO_HEIGHT} px). A imagem salva terá esse tamanho em pixels, sem margens
            vazias.
          </p>
          <p>- O servidor converte para preto e branco ao salvar.</p>
        </DialogDescription>
      </DialogHeader>

      <DialogContent sx={{ overflow: 'hidden' }}>
        <div
          ref={cropContainerRef}
          className="relative mx-auto overflow-hidden rounded-lg bg-primary"
          style={logoCropContainerStyle}
        >
          {imageSrc ? (
            <>
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                minZoom={LOGO_CROP_MIN_ZOOM}
                maxZoom={LOGO_CROP_MAX_ZOOM}
                cropSize={cropFrameSize}
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
              <LogoCropFrameHandles
                size={cropFrameSize}
                maxSize={maxCropFrameSize}
                onSizeChange={setCropFrameSize}
                disabled={isApplying}
              />
            </>
          ) : null}
        </div>
        <p className="mt-2 text-center font-nunito text-[10px] text-secondary-text">
          Moldura até {maxCropFrameSize.width} × {maxCropFrameSize.height} px (máx. cupom{' '}
          {LOGO_CROP_DISPLAY_WIDTH}×{LOGO_CROP_DISPLAY_HEIGHT})
          {outputSizeLabel ? (
            <>
              <br />
              Tamanho estimado do recorte: <span className="font-semibold">{outputSizeLabel}</span>
            </>
          ) : null}
        </p>

        <div className="mt-4">
          <div className="flex items-center gap-3">
            <span className="w-28 shrink-0 font-nunito text-xs text-secondary-text">Zoom</span>
            <input
              type="range"
              min={LOGO_CROP_MIN_ZOOM}
              max={LOGO_CROP_MAX_ZOOM}
              step={0.05}
              value={zoom}
              onChange={e => setZoom(Number(e.target.value))}
              className="h-2 min-w-0 flex-1 cursor-pointer accent-[var(--color-primary)]"
              aria-label="Zoom da imagem"
            />
          </div>
          <p className="mt-2 font-nunito text-[10px] text-secondary-text">
            Moldura atual: {cropFrameSize.width} × {cropFrameSize.height} px — arraste as alças
            brancas nas bordas.
          </p>
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
