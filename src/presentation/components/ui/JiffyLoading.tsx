import { cn } from '@/src/shared/utils/cn'

/** Tamanho padrão do GIF (equivale a w-16 h-16 no Tailwind). */
const DEFAULT_IMAGE_SIZE_PX = 64

export interface JiffyLoadingProps {
  /** Texto opcional abaixo do GIF */
  text?: string
  /** Largura e altura do GIF em pixels (mantém proporção com object-contain) */
  size?: number
  /** Classes extras no container (ex.: padding, largura) */
  className?: string
}

/**
 * Loading com o GIF da marca (`/images/jiffy-loading.gif`).
 * Texto e tamanho são opcionais; sem tamanho informado usa o padrão.
 */
export function JiffyLoading({
  text,
  size = DEFAULT_IMAGE_SIZE_PX,
  className = '',
}: JiffyLoadingProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-2 py-8', className)}
      role="status"
      aria-live="polite"
    >
      <img
        src="/images/jiffy-loading.gif"
        alt="Carregando"
        width={size}
        height={size}
        className="object-contain"
        style={{ width: size, height: size }}
      />
      {text != null && text.trim() !== '' ? (
        <p className="text-center text-sm text-secondary-text">{text}</p>
      ) : null}
    </div>
  )
}
