import { temSeloCanalMarketplace } from '@/src/domain/policies/pedido/origemCanalMarketplace'
import { cn } from '@/src/shared/utils/cn'

type CanalLogoMarketplace = 'AIQFOME' | 'IFOOD'

const LOGO_CANAL: Record<
  CanalLogoMarketplace,
  { src: string; alt: string; bg: string }
> = {
  AIQFOME: { src: '/images/aiqfome.png', alt: 'Aiqfome', bg: '#5C0D8A' },
  IFOOD: { src: '/images/ifood.png', alt: 'iFood', bg: '#EA1D2C' },
}

function logoDoCanal(origem: string | null | undefined): CanalLogoMarketplace | null {
  const canal = String(origem ?? '').trim().toUpperCase()
  if (canal === 'IFOOD') return 'IFOOD'
  if (canal === 'AIQFOME') return 'AIQFOME'
  return null
}

export function OrigemCanalMark({
  origem,
  size = 28,
  width,
  className = '',
}: {
  origem: string | null | undefined
  size?: number
  width?: number
  className?: string
}) {
  if (!temSeloCanalMarketplace(origem)) return null
  const canal = logoDoCanal(origem)
  if (!canal) return null

  const logo = LOGO_CANAL[canal]

  return (
    <span
      title={logo.alt}
      className={cn(
        'inline-flex shrink-0 overflow-hidden rounded-md border border-gray-300',
        className
      )}
      style={{
        width: width ?? Math.round(size * 1.45),
        height: size,
        backgroundColor: logo.bg,
      }}
    >
      <img
        src={logo.src}
        alt={logo.alt}
        className="h-full w-full object-cover object-center"
      />
    </span>
  )
}
