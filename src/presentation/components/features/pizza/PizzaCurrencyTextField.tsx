'use client'

import { useEffect, useRef, useState } from 'react'
import { TextField, type TextFieldProps } from '@mui/material'
import { formatBRLFromMaskedInput, parseBRLToNumber } from '@/src/shared/utils/formatters'

type PizzaCurrencyTextFieldProps = Omit<TextFieldProps, 'value' | 'onChange' | 'type'> & {
  value: number
  onChange: (value: number) => void
}

function normalizeCurrencyValue(value: number) {
  return Math.round(value * 100) / 100
}

export function PizzaCurrencyTextField({
  value,
  onChange,
  disabled,
  onFocus,
  onBlur,
  inputProps,
  ...rest
}: PizzaCurrencyTextFieldProps) {
  const [inputValue, setInputValue] = useState(() => formatBRLFromMaskedInput(value))
  const isEditingRef = useRef(false)

  useEffect(() => {
    if (isEditingRef.current) return
    setInputValue(formatBRLFromMaskedInput(normalizeCurrencyValue(value)))
  }, [value])

  useEffect(() => {
    if (disabled) {
      isEditingRef.current = false
    }
  }, [disabled])

  return (
    <TextField
      {...rest}
      type="text"
      disabled={disabled}
      value={inputValue}
      placeholder="R$ 0,00"
      onChange={e => {
        isEditingRef.current = true
        const formatted = formatBRLFromMaskedInput(e.target.value)
        setInputValue(formatted)
        onChange(normalizeCurrencyValue(parseBRLToNumber(formatted) ?? 0))
      }}
      onFocus={e => {
        e.target.select()
        onFocus?.(e)
      }}
      onBlur={e => {
        isEditingRef.current = false
        const parsed = normalizeCurrencyValue(parseBRLToNumber(inputValue) ?? 0)
        const formatted = formatBRLFromMaskedInput(parsed)
        setInputValue(formatted)
        if (parsed !== normalizeCurrencyValue(value)) {
          onChange(parsed)
        }
        onBlur?.(e)
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
