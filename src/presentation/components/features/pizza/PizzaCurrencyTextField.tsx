'use client'

import { useEffect, useRef, useState } from 'react'
import { TextField, type TextFieldProps } from '@mui/material'
import {
  formatarDigitacaoMoedaBrlComImpacto,
  formatarMoedaBrlComImpacto,
  parseMoedaBrlComImpacto,
} from '@/src/application/pizza/pizzaComplementoImpacto'
import { formatBRLFromMaskedInput, parseBRLToNumber } from '@/src/shared/utils/formatters'
import type { TipoImpactoPreco } from '@/src/shared/types/pizza'

type PizzaCurrencyTextFieldProps = Omit<TextFieldProps, 'value' | 'onChange' | 'type'> & {
  value: number
  onChange: (value: number) => void
  /** Disparado após confirmar o valor (Enter), sem fechar o contexto pai. */
  onEnter?: () => void
  /**
   * Quando informado, exibe o sinal de impacto no valor
   * (`+ R$ …` / `- R$ …` / `R$ …` para nenhum).
   */
  tipoImpactoPreco?: TipoImpactoPreco
}

function normalizeCurrencyValue(value: number) {
  return Math.round(value * 100) / 100
}

function formatDisplay(value: number, tipoImpactoPreco?: TipoImpactoPreco) {
  const normalized = normalizeCurrencyValue(value)
  if (tipoImpactoPreco) {
    return formatarMoedaBrlComImpacto(normalized, tipoImpactoPreco)
  }
  return formatBRLFromMaskedInput(normalized)
}

function formatTyping(raw: string, tipoImpactoPreco?: TipoImpactoPreco) {
  if (tipoImpactoPreco) {
    return formatarDigitacaoMoedaBrlComImpacto(raw, tipoImpactoPreco)
  }
  return formatBRLFromMaskedInput(raw)
}

function parseTyping(raw: string, tipoImpactoPreco?: TipoImpactoPreco) {
  if (tipoImpactoPreco) {
    return normalizeCurrencyValue(parseMoedaBrlComImpacto(raw))
  }
  return normalizeCurrencyValue(parseBRLToNumber(raw) ?? 0)
}

export function PizzaCurrencyTextField({
  value,
  onChange,
  onEnter,
  disabled,
  onFocus,
  onBlur,
  onKeyDown,
  inputProps,
  tipoImpactoPreco,
  ...rest
}: PizzaCurrencyTextFieldProps) {
  const [inputValue, setInputValue] = useState(() => formatDisplay(value, tipoImpactoPreco))
  const isEditingRef = useRef(false)

  const commitInputValue = () => {
    isEditingRef.current = false
    const parsed = parseTyping(inputValue, tipoImpactoPreco)
    const formatted = formatDisplay(parsed, tipoImpactoPreco)
    setInputValue(formatted)
    if (parsed !== normalizeCurrencyValue(value)) {
      onChange(parsed)
    }
    return parsed
  }

  useEffect(() => {
    if (isEditingRef.current) return
    setInputValue(formatDisplay(value, tipoImpactoPreco))
  }, [value, tipoImpactoPreco])

  useEffect(() => {
    if (disabled) {
      isEditingRef.current = false
    }
  }, [disabled])

  const placeholder = tipoImpactoPreco
    ? formatarMoedaBrlComImpacto(0, tipoImpactoPreco)
    : 'R$ 0,00'

  return (
    <TextField
      {...rest}
      type="text"
      disabled={disabled}
      value={inputValue}
      placeholder={placeholder}
      onChange={e => {
        isEditingRef.current = true
        const formatted = formatTyping(e.target.value, tipoImpactoPreco)
        setInputValue(formatted)
        onChange(parseTyping(formatted, tipoImpactoPreco))
      }}
      onFocus={e => {
        e.target.select()
        onFocus?.(e)
      }}
      onBlur={e => {
        commitInputValue()
        onBlur?.(e)
      }}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          e.preventDefault()
          commitInputValue()
          onEnter?.()
        }
        onKeyDown?.(e)
      }}
      inputProps={{
        inputMode: 'decimal',
        autoComplete: 'off',
        ...inputProps,
        onClick: e => {
          e.currentTarget.select()
          e.stopPropagation()
          inputProps?.onClick?.(e)
        },
        onMouseUp: e => {
          e.preventDefault()
          inputProps?.onMouseUp?.(e)
        },
      }}
    />
  )
}
