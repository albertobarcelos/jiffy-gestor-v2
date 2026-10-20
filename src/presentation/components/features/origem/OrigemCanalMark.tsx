import {
  canalSeloOrigem,
  type CanalSeloOrigem,
  temSeloCanalOrigem,
} from '@/src/domain/policies/pedido/origemCanalMarketplace'
import { colors } from '@/src/shared/theme/colors'
import { cn } from '@/src/shared/utils/cn'

type LogoOrigemConfig = {
  src: string
  alt: string
  bg: string
  borderColor?: string
  /** Ícone quadrado (cardápio); marketplaces usam faixa horizontal. */
  square?: boolean
  /** Escala do desenho dentro do selo (0–1). */
  imageScale?: number
}

const LOGO_ORIGEM: Record<CanalSeloOrigem, LogoOrigemConfig> = {
  AIQFOME: { src: '/images/aiqfome.png', alt: 'Aiqfome', bg: '#5C0D8A' },
  IFOOD: { src: '/images/ifood.png', alt: 'iFood', bg: '#EA1D2C' },
  JIFFY_DELIVERY: {
    src: '/images/cardapio-online.png',
    alt: 'Cardápio online',
    bg: '#FFFFFF',
    borderColor: colors.primary,
    square: true,
    imageScale: 0.88,
  },
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
  if (!temSeloCanalOrigem(origem)) return null

  const canal = canalSeloOrigem(origem)
  if (!canal) return null
  const logo = LOGO_ORIGEM[canal]
  const imageScale = logo.imageScale ?? 1

  return (
    <span
      title={logo.alt}
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-gray-300',
        className
      )}
      style={{
        width: width ?? (logo.square ? size : Math.round(size * 1.45)),
        height: size,
        backgroundColor: logo.bg,
        ...(logo.borderColor
          ? { borderColor: logo.borderColor, borderWidth: 2, borderStyle: 'solid' as const }
          : {}),
      }}
    >
      <img
        src={logo.src}
        alt={logo.alt}
        className={logo.square ? 'object-contain' : 'h-full w-full object-cover object-center'}
        style={
          logo.square
            ? {
                height: `${Math.round(imageScale * 100)}%`,
                width: 'auto',
                maxWidth: '92%',
              }
            : undefined
        }
      />
    </span>
  )
}
