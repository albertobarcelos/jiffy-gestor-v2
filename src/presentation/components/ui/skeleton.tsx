'use client'

import * as React from 'react'
import { Skeleton as MuiSkeleton, SkeletonProps as MuiSkeletonProps } from '@mui/material'

export interface SkeletonProps extends MuiSkeletonProps {}

/**
 * Placeholder de carregamento (Material UI).
 * A animação padrão é `wave` — o mesmo shimmer usado no catálogo de produtos.
 */
export const Skeleton = React.forwardRef<HTMLSpanElement, SkeletonProps>(
  ({ animation = 'wave', ...props }, ref) => {
    return <MuiSkeleton ref={ref} animation={animation} {...props} />
  }
)

Skeleton.displayName = 'Skeleton'
