'use client'

import * as React from 'react'
import { Skeleton as MuiSkeleton, SkeletonProps as MuiSkeletonProps } from '@mui/material'

export interface SkeletonProps extends MuiSkeletonProps {}

/**
 * Componente Skeleton usando Material UI
 */
export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>((props, ref) => {
  return <MuiSkeleton ref={ref} {...props} />
})

Skeleton.displayName = 'Skeleton'
