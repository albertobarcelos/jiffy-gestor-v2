'use client'

import { cn } from '@/src/shared/utils/cn'

interface PizzaPedacosIconProps {
  /** Quantidade de divisões (sabores). */
  divisoes: number
  className?: string
  size?: number
}

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  }
}

function slicePath(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, radius, endAngle)
  const end = polarToCartesian(cx, cy, radius, startAngle)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y}`,
    'Z',
  ].join(' ')
}

/** Círculo dividido conforme a quantidade de sabores. */
export function PizzaPedacosIcon({ divisoes, className, size = 40 }: PizzaPedacosIconProps) {
  const n = Math.max(1, Math.min(Math.floor(divisoes) || 1, 16))
  const cx = 50
  const cy = 50
  const radius = 42
  const fill = 'var(--color-primary)'
  const stroke = '#FFFFFF'

  if (n === 1) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className={cn('shrink-0', className)}
        aria-hidden
      >
        <circle cx={cx} cy={cy} r={radius} fill={fill} />
      </svg>
    )
  }

  const angle = 360 / n

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={cn('shrink-0', className)}
      aria-hidden
    >
      {Array.from({ length: n }, (_, index) => {
        const start = index * angle
        const end = (index + 1) * angle
        return (
          <path
            key={index}
            d={slicePath(cx, cy, radius, start, end)}
            fill={fill}
            stroke={stroke}
            strokeWidth={2}
          />
        )
      })}
    </svg>
  )
}
