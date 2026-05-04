'use client'

import { useState, useEffect, useCallback } from 'react'
import { parseBRLToNumber, formatBRLFromMaskedInput } from '@/src/shared/utils/formatters'

interface ProdutoValorInputProps {
  valor: number
  disabled?: boolean
  onCommit: (novoValor: number) => void
}

export function ProdutoValorInput({ valor, disabled = false, onCommit }: ProdutoValorInputProps) {
  const [inputValue, setInputValue] = useState(() => formatBRLFromMaskedInput(valor))

  useEffect(() => {
    setInputValue(formatBRLFromMaskedInput(valor))
  }, [valor])

  const handleCommit = useCallback(() => {
    const parsed = parseBRLToNumber(inputValue)
    if (parsed === null || parsed === valor) {
      setInputValue(formatBRLFromMaskedInput(valor))
      return
    }
    onCommit(parsed)
  }, [inputValue, valor, onCommit])

  // Debounce: salva automaticamente 1,5 s após parar de digitar
  useEffect(() => {
    const timer = setTimeout(handleCommit, 1500)
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
      onBlur={handleCommit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
      disabled={disabled}
      className="p-2 rounded-xl border border-gray-200 focus:border-primary focus:outline-none md:text-sm text-xs font-normal text-primary-text w-24 disabled:opacity-60 disabled:cursor-not-allowed"
    />
  )
}
