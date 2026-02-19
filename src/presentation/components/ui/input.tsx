'use client'

import * as React from 'react'
import { TextField, TextFieldProps } from '@mui/material'

export interface InputProps extends Omit<TextFieldProps, 'variant'> {
  variant?: 'outlined' | 'filled' | 'standard'
}

/**
 * Componente Input usando Material UI TextField.
 * Padrão visual alinhado ao Select (Radix UI):
 * - size="small" → altura ~40px (h-10)
 * - borderRadius: 6px → equivalente ao rounded-md do Tailwind
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ variant = 'outlined', value, size = 'small', sx, ...props }, ref) => {
    // Garante que o value seja sempre uma string para evitar problemas com placeholder
    const normalizedValue = value === null || value === undefined ? '' : value

    return (
      <TextField
        ref={ref}
        variant={variant}
        fullWidth
        value={normalizedValue}
        size={size}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: '6px',
          },
          ...sx,
        }}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'

