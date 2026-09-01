import { useLayoutEffect, useState, type RefObject } from 'react'
import {
  getCropPresetAspect,
  type CropFrameSize,
  type ImageCropPreset,
} from '@/src/presentation/utils/imageCrop'

const CONTAINER_PADDING = 24

/**
 * Tamanho máximo da moldura no contentor (encolhe em ecrãs estreitos).
 */
export function useMaxCropFrameSize(
  containerRef: RefObject<HTMLDivElement | null>,
  enabled: boolean,
  preset: ImageCropPreset
): CropFrameSize {
  const [maxSize, setMaxSize] = useState<CropFrameSize>({
    width: preset.displayFrameWidth,
    height: preset.displayFrameHeight,
  })

  useLayoutEffect(() => {
    if (!enabled) return

    const el = containerRef.current
    if (!el) return

    const update = () => {
      const { width: cw, height: ch } = el.getBoundingClientRect()
      const innerW = Math.max(0, cw - CONTAINER_PADDING * 2)
      const innerH = Math.max(0, ch - CONTAINER_PADDING * 2)

      let w = preset.displayFrameWidth
      let h = preset.displayFrameHeight
      const aspect = getCropPresetAspect(preset)

      if (innerW < w || innerH < h) {
        const scaleW = innerW > 0 ? innerW / w : 1
        const scaleH = innerH > 0 ? innerH / h : 1
        const scale = Math.min(scaleW, scaleH, 1)
        w = Math.floor(w * scale)
        h = preset.lockAspectRatio ? Math.floor(w / aspect) : Math.floor(h * scale)
      }

      setMaxSize(prev =>
        prev.width === w && prev.height === h ? prev : { width: w, height: h }
      )
    }

    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [
    containerRef,
    enabled,
    preset.displayFrameWidth,
    preset.displayFrameHeight,
    preset.lockAspectRatio,
    preset.maxOutputWidth,
    preset.maxOutputHeight,
  ])

  return maxSize
}

export function getCropContainerStyle(preset: ImageCropPreset): React.CSSProperties {
  return {
    width: preset.containerWidth,
    height: preset.containerHeight,
    maxWidth: '100%',
  }
}
