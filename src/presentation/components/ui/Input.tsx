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
  ({ variant = 'outlined', ...props }, ref) => {
    return <TextField ref={ref} variant={variant} fullWidth {...props} />
  }
)

Input.displayName = 'Input'
