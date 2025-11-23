'use client'

import * as React from 'react'
import { Badge as MuiBadge, Chip, ChipProps } from '@mui/material'

export interface BadgeProps extends ChipProps {
  variant?: 'default' | 'outline' | 'secondary' | 'destructive'
}

/**
 * Componente Badge usando Material UI Chip
 */
export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ variant = 'default', ...props }, ref) => {
    const chipVariant = variant === 'outline' ? 'outlined' : 'filled'
    
    return <Chip ref={ref} variant={chipVariant} size="small" {...props} />
  }
)

Badge.displayName = 'Badge'
