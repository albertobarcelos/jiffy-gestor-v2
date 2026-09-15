'use client'

import * as React from 'react'
import { Skeleton, type SkeletonProps } from '@/src/presentation/components/ui/skeleton'
import { cn } from '@/src/shared/utils/cn'

/**
 * Paleta do shimmer estilo Facebook: cinza estável com onda clara da esquerda
 * para a direita. Use em qualquer tela; o catálogo de produtos e o painel de
 * configurações de impressão compartilham este visual.
 */
export const SHIMMER_SX = {
  bgcolor: '#E4E6EB',
  '&::after': {
    background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.72), transparent)',
  },
} as const

export type ShimmerProps = SkeletonProps

export function Shimmer({ animation = 'wave', sx, ...props }: ShimmerProps) {
  return (
    <Skeleton
      animation={animation}
      sx={{
        ...SHIMMER_SX,
        transform: 'none',
        ...sx,
      }}
      {...props}
    />
  )
}

export function ShimmerLine({
  width = '100%',
  height = 14,
  className,
}: {
  width?: number | string
  height?: number | string
  className?: string
}) {
  return <Shimmer variant="text" width={width} height={height} className={className} />
}

export function ShimmerRect({
  width = '100%',
  height,
  radius = 8,
  className,
}: {
  width?: number | string
  height: number | string
  radius?: number
  className?: string
}) {
  return (
    <Shimmer
      variant="rectangular"
      width={width}
      height={height}
      className={className}
      sx={{ borderRadius: `${radius}px` }}
    />
  )
}

export function ShimmerCircle({ size, className }: { size: number; className?: string }) {
  return <Shimmer variant="circular" width={size} height={size} className={className} />
}

/** Preenche o ancestral `relative` — padrão das fotos do catálogo de produtos. */
export function ShimmerFill({
  className,
  radius,
}: {
  className?: string
  radius?: number | string
}) {
  return (
    <Shimmer
      variant="rectangular"
      width="100%"
      height="100%"
      className={className}
      sx={{
        position: 'absolute',
        inset: 0,
        borderRadius: radius ?? 0,
      }}
    />
  )
}

export function ShimmerRepeat({
  count,
  children,
}: {
  count: number
  children: (index: number) => React.ReactNode
}) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <React.Fragment key={index}>{children(index)}</React.Fragment>
      ))}
    </>
  )
}

export function ShimmerPanel({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('rounded-lg border border-gray-200 bg-white p-2 shadow-sm', className)}>
      {children}
    </div>
  )
}

export function ShimmerPanelHeader() {
  return (
    <div className="flex items-start gap-2" aria-hidden>
      <ShimmerRect width={36} height={36} radius={8} />
      <div className="min-w-0 flex-1 pt-1.5">
        <ShimmerLine width="46%" height={18} />
      </div>
      <ShimmerRect width={24} height={24} radius={6} />
    </div>
  )
}

export function ShimmerFieldRow({ withToggle = false }: { withToggle?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-white px-2 py-2 shadow-sm ring-1 ring-gray-100">
      <ShimmerLine width="58%" height={16} />
      {withToggle ? (
        <ShimmerRect width={16} height={16} radius={4} />
      ) : (
        <ShimmerRect width={120} height={32} radius={8} />
      )}
    </div>
  )
}
