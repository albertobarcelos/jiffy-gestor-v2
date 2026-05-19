'use client'

import * as React from 'react'
import { TextField, TextFieldProps } from '@mui/material'
import { sxCampoOutlinedPadrao } from '@/src/shared/theme/muiOutlinedFieldSx'

export interface InputProps extends Omit<TextFieldProps, 'variant'> {
  variant?: 'outlined' | 'filled' | 'standard'
  min?: string | number
  max?: string | number
  step?: string | number
  maxLength?: number
  minLength?: number
  pattern?: string
}

/**
 * TextField outlined padrão do gestor: label na borda, borda visível (compatível com Tailwind + MUI layers).
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      variant = 'outlined',
      value,
      size,
      min,
      max,
      step,
      maxLength,
      minLength,
      pattern,
      inputProps,
      sx,
      ...props
    },
    ref
  ) => {
    const normalizedValue = value === null || value === undefined ? '' : value

    const mergedInputProps = {
      ...inputProps,
      ...(min !== undefined && { min }),
      ...(max !== undefined && { max }),
      ...(step !== undefined && { step }),
      ...(maxLength !== undefined && { maxLength }),
      ...(minLength !== undefined && { minLength }),
      ...(pattern !== undefined && { pattern }),
    }

    const mergedSx =
      variant === 'outlined'
        ? [sxCampoOutlinedPadrao, ...(Array.isArray(sx) ? sx : sx != null ? [sx] : [])]
        : sx

    return (
      <TextField
        ref={ref}
        variant={variant}
        fullWidth
        value={normalizedValue}
        size={size}
        inputProps={mergedInputProps}
        sx={mergedSx}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'
