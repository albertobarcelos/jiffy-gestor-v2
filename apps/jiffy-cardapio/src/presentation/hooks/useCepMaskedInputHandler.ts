'use client'

import { useCallback, useLayoutEffect, useRef, type ChangeEvent } from 'react'
import {
  contarDigitosAtePosicao,
  formatarCepMascara,
  mapearPosicaoCaretMascaraCep,
} from '@/src/shared/utils/consultaCep'

/**
 * Aplica máscara de CEP preservando o caret ao editar no meio do campo.
 */
export function useCepMaskedInputHandler(
  value: string,
  onValueChange: (value: string) => void
) {
  const inputRef = useRef<HTMLInputElement>(null)
  const caretRef = useRef<number | null>(null)

  useLayoutEffect(() => {
    if (caretRef.current == null) return
    const el = inputRef.current
    const caret = caretRef.current
    caretRef.current = null
    if (!el) return
    const max = el.value.length
    const next = Math.max(0, Math.min(caret, max))
    el.setSelectionRange(next, next)
  }, [value])

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const el = event.target
      const raw = el.value
      const selection = el.selectionStart ?? raw.length
      const digitosAntes = contarDigitosAtePosicao(raw, selection)
      const masked = formatarCepMascara(raw)
      caretRef.current = mapearPosicaoCaretMascaraCep(masked, digitosAntes)
      onValueChange(masked)
    },
    [onValueChange]
  )

  return { inputRef, handleChange }
}
