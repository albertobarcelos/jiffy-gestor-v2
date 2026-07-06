import { useLayoutEffect, useState, type RefObject } from 'react'
import {
  LOGO_CROP_CONTAINER_HEIGHT,
  LOGO_CROP_CONTAINER_WIDTH,
  LOGO_CROP_DISPLAY_HEIGHT,
  LOGO_CROP_DISPLAY_WIDTH,
  LOGO_IMPRESSAO_ASPECT,
  type CropFrameSize,
} from '@/src/presentation/utils/logoImpressaoCrop'

const CONTAINER_PADDING = 24

/**
 * Tamanho máximo da moldura no contentor (referência 280×150; encolhe em ecrãs estreitos).
 */
export function useMaxCropFrameSize(
  containerRef: RefObject<HTMLDivElement | null>,
  enabled: boolean
): CropFrameSize {
  const [maxSize, setMaxSize] = useState<CropFrameSize>({
    width: LOGO_CROP_DISPLAY_WIDTH,
    height: LOGO_CROP_DISPLAY_HEIGHT,
  })

  useLayoutEffect(() => {
    if (!enabled) return

    const el = containerRef.current
    if (!el) return

    const update = () => {
      const { width: cw, height: ch } = el.getBoundingClientRect()
      const innerW = Math.max(0, cw - CONTAINER_PADDING * 2)
      const innerH = Math.max(0, ch - CONTAINER_PADDING * 2)

      let w = LOGO_CROP_DISPLAY_WIDTH
      let h = LOGO_CROP_DISPLAY_HEIGHT

      if (innerW < w || innerH < h) {
        const scaleW = innerW > 0 ? innerW / w : 1
        const scaleH = innerH > 0 ? innerH / h : 1
        const scale = Math.min(scaleW, scaleH, 1)
        w = Math.floor(w * scale)
        h = Math.floor(w / LOGO_IMPRESSAO_ASPECT)
      }

      setMaxSize(prev =>
        prev.width === w && prev.height === h ? prev : { width: w, height: h }
      )
    }

    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [containerRef, enabled])

  return maxSize
}

export const logoCropContainerStyle: React.CSSProperties = {
  width: LOGO_CROP_CONTAINER_WIDTH,
  height: LOGO_CROP_CONTAINER_HEIGHT,
  maxWidth: '100%',
}
