'use client'

import * as React from 'react'
import { TextField, TextFieldProps } from '@mui/material'

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
 * Componente Input usando Material UI TextField
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ variant = 'outlined', value, min, max, step, maxLength, minLength, pattern, inputProps, ...props }, ref) => {
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
    
    return (
      <TextField
        ref={ref}
        variant={variant}
        fullWidth
        value={normalizedValue}
        inputProps={mergedInputProps}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'

