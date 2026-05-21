'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/src/presentation/components/ui/dialog'
import {
  LOGO_IMPRESSAO_ASPECT,
  LOGO_IMPRESSAO_HEIGHT,
  LOGO_IMPRESSAO_WIDTH,
  cropImageToLogoImpressao,
  LOGO_CROP_DISPLAY_HEIGHT,
  LOGO_CROP_DISPLAY_WIDTH,
} from '@/src/presentation/utils/logoImpressaoCrop'
import { showToast } from '@/src/shared/utils/toast'
import {
  logoCropContainerStyle,
  useLogoCropDisplaySize,
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
  const [cropAreaReady, setCropAreaReady] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const cropContainerRef = useRef<HTMLDivElement>(null)
  const cropDisplaySize = useLogoCropDisplaySize(cropContainerRef, open && !!imageSrc)
  /** Percentagens da moldura — fonte de verdade no momento de Aplicar (evita estado React atrasado). */
  const croppedAreaPercentRef = useRef<Area | null>(null)

  useEffect(() => {
    if (!open) {
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      croppedAreaPercentRef.current = null
      setCropAreaReady(false)
      setIsApplying(false)
    }
  }, [open])

  const syncCropArea = useCallback((areaPercent: Area, _areaPixels: Area) => {
    croppedAreaPercentRef.current = areaPercent
    setCropAreaReady(true)
  }, [])

  const handleApply = async () => {
    const areaPercent = croppedAreaPercentRef.current
    if (!imageSrc || !areaPercent) return
    setIsApplying(true)
    try {
      const file = await cropImageToLogoImpressao(imageSrc, areaPercent)
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
          - A moldura abaixo tem sempre o tamanho ({LOGO_CROP_DISPLAY_WIDTH}×
          {LOGO_CROP_DISPLAY_HEIGHT} px).
          <p>
            - A imagem final terá {LOGO_IMPRESSAO_WIDTH}×{LOGO_IMPRESSAO_HEIGHT} px; logos
            menores ficam centradas com margens transparentes (sem ampliar).
          </p>
          <p>- O servidor converte para preto e branco ao salvar.</p>
        </DialogDescription>
      </DialogHeader>

      <DialogContent sx={{ overflow: 'hidden' }}>
        <div
          ref={cropContainerRef}
          className="relative mx-auto overflow-hidden rounded-lg bg-neutral-900"
          style={logoCropContainerStyle}
        >
          {imageSrc ? (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              minZoom={LOGO_CROP_MIN_ZOOM}
              maxZoom={LOGO_CROP_MAX_ZOOM}
              aspect={LOGO_IMPRESSAO_ASPECT}
              cropSize={cropDisplaySize}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropAreaChange={syncCropArea}
              onCropComplete={syncCropArea}
              objectFit="contain"
              showGrid
              style={{
                cropAreaStyle: {
                  border: '2px solid rgba(255,255,255,0.95)',
                },
              }}
            />
          ) : null}
        </div>
        <p className="mt-2 text-center font-nunito text-[10px] text-secondary-text">
          Moldura fixa: {LOGO_CROP_DISPLAY_WIDTH} × {LOGO_CROP_DISPLAY_HEIGHT} px (proporção do cupom)
        </p>

        <div className="mt-4 space-y-1">
          <div className="flex items-center gap-3">
            <span className="shrink-0 font-nunito text-xs text-secondary-text">Zoom</span>
            <input
              type="range"
              min={LOGO_CROP_MIN_ZOOM}
              max={LOGO_CROP_MAX_ZOOM}
              step={0.05}
              value={zoom}
              onChange={e => setZoom(Number(e.target.value))}
              className="h-2 w-full cursor-pointer accent-[var(--color-primary)]"
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
