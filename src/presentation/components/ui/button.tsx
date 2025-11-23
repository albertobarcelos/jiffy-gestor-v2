'use client'

import * as React from 'react'
import { Button as MuiButton, ButtonProps as MuiButtonProps, CircularProgress } from '@mui/material'

export interface ButtonProps extends Omit<MuiButtonProps, 'variant' | 'size'> {
  variant?: 'contained' | 'outlined' | 'text' | 'ghost'
  size?: 'small' | 'medium' | 'large'
  isLoading?: boolean
}

/**
 * Componente Button usando Material UI
 * Wrapper para manter compatibilidade com código existente
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'contained', size = 'medium', isLoading, children, disabled, ...props }, ref) => {
    // Mapear variant 'ghost' para 'text'
    const muiVariant = variant === 'ghost' ? 'text' : variant

    return (
      <MuiButton
        ref={ref}
        variant={muiVariant}
        size={size}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <CircularProgress size={16} sx={{ mr: 1 }} />
            Carregando...
          </>
        ) : (
          children
        )}
      </MuiButton>
    )
  }
)

Button.displayName = 'Button'
