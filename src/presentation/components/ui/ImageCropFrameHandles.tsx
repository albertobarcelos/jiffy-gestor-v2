'use client'

import { useCallback, useEffect, useRef } from 'react'
import {
  clampCropFrameSize,
  type CropFrameSize,
  type ImageCropPreset,
} from '@/src/presentation/utils/imageCrop'

type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

interface ImageCropFrameHandlesProps {
  size: CropFrameSize
  maxSize: CropFrameSize
  preset: ImageCropPreset
  onSizeChange: (size: CropFrameSize) => void
  disabled?: boolean
}

const HANDLE_HIT = 10

const HANDLES: { id: ResizeHandle; className: string; cursor: string }[] = [
  { id: 'n', className: 'left-1/2 top-0 -translate-x-1/2 -translate-y-1/2', cursor: 'ns-resize' },
  { id: 's', className: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2', cursor: 'ns-resize' },
  { id: 'e', className: 'right-0 top-1/2 -translate-y-1/2 translate-x-1/2', cursor: 'ew-resize' },
  { id: 'w', className: 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2', cursor: 'ew-resize' },
  { id: 'ne', className: 'right-0 top-0 translate-x-1/2 -translate-y-1/2', cursor: 'nesw-resize' },
  { id: 'nw', className: 'left-0 top-0 -translate-x-1/2 -translate-y-1/2', cursor: 'nwse-resize' },
  { id: 'se', className: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2', cursor: 'nwse-resize' },
  { id: 'sw', className: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2', cursor: 'nesw-resize' },
]

function applyResize(
  handle: ResizeHandle,
  start: CropFrameSize,
  dx: number,
  dy: number
): CropFrameSize {
  let width = start.width
  let height = start.height

  switch (handle) {
    case 'e':
      width = start.width + dx
      break
    case 'w':
      width = start.width - dx
      break
    case 'n':
      height = start.height - dy
      break
    case 's':
      height = start.height + dy
      break
    case 'ne':
      width = start.width + dx
      height = start.height - dy
      break
    case 'nw':
      width = start.width - dx
      height = start.height - dy
      break
    case 'se':
      width = start.width + dx
      height = start.height + dy
      break
    case 'sw':
      width = start.width - dx
      height = start.height + dy
      break
  }

  return { width, height }
}

export function ImageCropFrameHandles({
  size,
  maxSize,
  preset,
  onSizeChange,
  disabled = false,
}: ImageCropFrameHandlesProps) {
  const dragRef = useRef<{
    handle: ResizeHandle
    startPointer: { x: number; y: number }
    startSize: CropFrameSize
  } | null>(null)

  const endDrag = useCallback(() => {
    dragRef.current = null
  }, [])

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return
      const dx = e.clientX - drag.startPointer.x
      const dy = e.clientY - drag.startPointer.y
      const next = applyResize(drag.handle, drag.startSize, dx, dy)
      onSizeChange(clampCropFrameSize(next, maxSize, preset))
    },
    [maxSize, onSizeChange, preset]
  )

  useEffect(() => {
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', endDrag)
    window.addEventListener('pointercancel', endDrag)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', endDrag)
      window.removeEventListener('pointercancel', endDrag)
    }
  }, [endDrag, onPointerMove])

  const startDrag = (handle: ResizeHandle) => (e: React.PointerEvent) => {
    if (disabled) return
    e.preventDefault()
    e.stopPropagation()
    dragRef.current = {
      handle,
      startPointer: { x: e.clientX, y: e.clientY },
      startSize: size,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  return (
    <div
      className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2"
      style={{ width: size.width, height: size.height }}
      aria-hidden
    >
      <div className="absolute inset-0 rounded-sm ring-2 ring-white/90 ring-inset" />
      {HANDLES.map(h => (
        <button
          key={h.id}
          type="button"
          tabIndex={-1}
          aria-label={`Redimensionar ${h.id}`}
          disabled={disabled}
          onPointerDown={startDrag(h.id)}
          className={`pointer-events-auto absolute z-30 rounded-sm border border-white/90 bg-white/90 shadow ${h.className}`}
          style={{
            width: HANDLE_HIT,
            height: HANDLE_HIT,
            cursor: disabled ? 'default' : h.cursor,
          }}
        />
      ))}
    </div>
  )
}
