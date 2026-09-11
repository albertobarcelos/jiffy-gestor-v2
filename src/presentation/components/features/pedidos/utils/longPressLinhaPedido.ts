import type { MouseEvent, RefObject } from 'react'

const LONG_PRESS_MS = 800

export function deveIgnorarLongPressLinha(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return true
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'BUTTON' ||
    Boolean(target.closest('button')) ||
    Boolean(target.closest('input'))
  )
}

export function criarHandlersLongPressLinha(params: {
  index: number
  indexRef: RefObject<number | null>
  timeoutRef: RefObject<ReturnType<typeof setTimeout> | null>
  onLongPress: () => void
}): {
  onMouseDown: (e: MouseEvent) => void
  onMouseUp: () => void
  onMouseLeave: () => void
} {
  const limpar = () => {
    if (params.timeoutRef.current) {
      clearTimeout(params.timeoutRef.current)
      params.timeoutRef.current = null
    }
    params.indexRef.current = null
  }

  return {
    onMouseDown: e => {
      if (deveIgnorarLongPressLinha(e.target)) return
      params.indexRef.current = params.index
      params.timeoutRef.current = setTimeout(() => {
        if (params.indexRef.current === params.index) {
          params.onLongPress()
        }
      }, LONG_PRESS_MS)
    },
    onMouseUp: limpar,
    onMouseLeave: limpar,
  }
}
