'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { parseBRLToNumber, formatBRLFromMaskedInput } from '@/src/shared/utils/formatters'

export type ProdutoValorCommitResult = void | boolean | Promise<void | boolean>

interface ProdutoValorInputProps {
  valor: number
  disabled?: boolean
  /**
   * Retorne `false` (ou Promise de `false`) para indicar cancelamento —
   * o input volta ao `valor` prop sem recarregar a página.
   */
  onCommit: (novoValor: number) => ProdutoValorCommitResult
}

export function ProdutoValorInput({ valor, disabled = false, onCommit }: ProdutoValorInputProps) {
  const [inputValue, setInputValue] = useState(() => formatBRLFromMaskedInput(valor))
  const committingRef = useRef(false)
  const onCommitRef = useRef(onCommit)
  onCommitRef.current = onCommit

  useEffect(() => {
    if (committingRef.current) return
    setInputValue(formatBRLFromMaskedInput(valor))
  }, [valor])

  const handleCommit = useCallback(async () => {
    if (committingRef.current || disabled) return

    const parsed = parseBRLToNumber(inputValue)
    if (parsed === null || parsed === valor) {
      setInputValue(formatBRLFromMaskedInput(valor))
      return
    }

    committingRef.current = true
    try {
      const result = await onCommitRef.current(parsed)
      if (result === false) {
        setInputValue(formatBRLFromMaskedInput(valor))
      }
    } catch {
      setInputValue(formatBRLFromMaskedInput(valor))
    } finally {
      committingRef.current = false
    }
  }, [inputValue, valor, disabled])

  // Debounce: salva automaticamente 1,5 s após parar de digitar
  useEffect(() => {
    const timer = setTimeout(() => {
      void handleCommit()
    }, 1500)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue])

  return (
    <input
      type="text"
      aria-label="Valor em reais"
      value={inputValue}
      onChange={(e) => setInputValue(formatBRLFromMaskedInput(e.target.value))}
      onFocus={(e) => e.target.select()}
      onClick={(e) => {
        e.currentTarget.select()
        e.stopPropagation()
      }}
      onMouseUp={(e) => e.preventDefault()}
      onBlur={() => {
        void handleCommit()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
      disabled={disabled}
      className="w-24 rounded-lg border border-primary/50 bg-info p-2 text-center text-xs font-normal text-primary-text focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 md:text-sm"
    />
  )
}
