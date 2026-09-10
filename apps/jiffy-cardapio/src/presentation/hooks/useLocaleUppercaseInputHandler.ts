'use client'

import { useCallback, useLayoutEffect, useRef, type ChangeEvent } from 'react'
import { toLocaleUppercasePt } from '@/src/shared/utils/localeUppercase'

export { toLocaleUppercasePt }

export interface UseLocaleUppercaseInputHandlerOptions {
  maxLength?: number
  locale?: string
}

/**
 * Preserva a posição do cursor ao aplicar toLocaleUpperCase no onChange
 * (evita o cursor pular para o fim ao editar no meio do texto).
 */
export function useLocaleUppercaseInputHandler<
  TElement extends HTMLInputElement | HTMLTextAreaElement = HTMLInputElement,
>(
  value: string,
  onValueChange: (value: string) => void,
  options: UseLocaleUppercaseInputHandlerOptions = {}
) {
  const { maxLength, locale = 'pt-BR' } = options
  const inputRef = useRef<TElement>(null)
  const cursorRef = useRef<{ start: number; end: number } | null>(null)

  useLayoutEffect(() => {
    if (!cursorRef.current) return
    const el = inputRef.current
    const cursor = cursorRef.current
    cursorRef.current = null
    if (!el) return
    const max = el.value.length
    el.setSelectionRange(Math.min(cursor.start, max), Math.min(cursor.end, max))
  }, [value])

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const el = event.target
      cursorRef.current = {
        start: el.selectionStart ?? el.value.length,
        end: el.selectionEnd ?? el.value.length,
      }
      let next = el.value.toLocaleUpperCase(locale)
      if (maxLength !== undefined) {
        next = next.slice(0, maxLength)
      }
      onValueChange(next)
    },
    [onValueChange, maxLength, locale]
  )

  return { inputRef, handleChange }
}
