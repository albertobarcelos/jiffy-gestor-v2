'use client'

import { useCallback, useLayoutEffect, useRef, type ChangeEvent } from 'react'
import {
  formatarBuscaEnderecoPlacesInput,
  resolverModoMascaraBuscaEnderecoPlaces,
} from '@/src/shared/utils/buscaEnderecoPlacesInput'
import {
  contarDigitosAtePosicao,
  mapearPosicaoCaretMascaraCep,
} from '@/src/shared/utils/consultaCep'

export type UseBuscaEnderecoPlacesInputHandlerOptions = {
  upperCaseLivre?: boolean
}

/**
 * Input do Places: máscara de CEP se começar com número; texto livre se começar com letra.
 * Preserva caret em ambos os modos.
 */
export function useBuscaEnderecoPlacesInputHandler(
  value: string,
  onValueChange: (value: string) => void,
  options: UseBuscaEnderecoPlacesInputHandlerOptions = {}
) {
  const { upperCaseLivre = false } = options
  const inputRef = useRef<HTMLInputElement>(null)
  const caretRef = useRef<{ start: number; end: number } | null>(null)

  useLayoutEffect(() => {
    if (!caretRef.current) return
    const el = inputRef.current
    const caret = caretRef.current
    caretRef.current = null
    if (!el) return
    const max = el.value.length
    el.setSelectionRange(Math.min(caret.start, max), Math.min(caret.end, max))
  }, [value])

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const el = event.target
      const raw = el.value
      const selectionStart = el.selectionStart ?? raw.length
      const selectionEnd = el.selectionEnd ?? raw.length
      const modo = resolverModoMascaraBuscaEnderecoPlaces(raw)

      if (modo === 'cep') {
        const digitosAntes = contarDigitosAtePosicao(raw, selectionStart)
        const masked = formatarBuscaEnderecoPlacesInput(raw, { upperCaseLivre })
        const nextCaret = mapearPosicaoCaretMascaraCep(masked, digitosAntes)
        caretRef.current = { start: nextCaret, end: nextCaret }
        onValueChange(masked)
        return
      }

      const formatted = formatarBuscaEnderecoPlacesInput(raw, { upperCaseLivre })
      caretRef.current = {
        start: Math.min(selectionStart, formatted.length),
        end: Math.min(selectionEnd, formatted.length),
      }
      onValueChange(formatted)
    },
    [onValueChange, upperCaseLivre]
  )

  return { inputRef, handleChange }
}
