'use client'

import * as React from 'react'
import { TextField, TextFieldProps } from '@mui/material'

export interface InputProps extends Omit<TextFieldProps, 'variant'> {
  variant?: 'outlined' | 'filled' | 'standard'
}

/**
 * Componente Input usando Material UI TextField
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ variant = 'outlined', value, ...props }, ref) => {
    // Garante que o value seja sempre uma string para evitar problemas com placeholder
    const normalizedValue = value === null || value === undefined ? '' : value
    
    return (
      <TextField
        ref={ref}
        variant={variant}
        fullWidth
        value={normalizedValue}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'

