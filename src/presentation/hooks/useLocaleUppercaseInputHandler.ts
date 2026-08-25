'use client'

import { useCallback, useLayoutEffect, useRef, type ChangeEvent } from 'react'

const LOCALE_PT = 'pt-BR'

export interface UseLocaleUppercaseInputHandlerOptions {
  maxLength?: number
  locale?: string
}

export function toLocaleUppercasePt(valor: string, locale = LOCALE_PT): string {
  return valor.toLocaleUpperCase(locale)
}

/**
 * Preserva a posição do cursor ao aplicar toLocaleUpperCase no onChange
 * (evita o cursor pular para o fim ao editar no meio do texto).
 */
export function useLocaleUppercaseInputHandler(
  value: string,
  onValueChange: (value: string) => void,
  options: UseLocaleUppercaseInputHandlerOptions = {}
) {
  const { maxLength, locale = LOCALE_PT } = options
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)
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
