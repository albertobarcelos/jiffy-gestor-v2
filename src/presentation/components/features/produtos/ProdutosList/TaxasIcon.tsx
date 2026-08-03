'use client'

/**
 * Ícone de taxa a partir de `public/icons/taxas.svg`.
 * Mask + `currentColor` para acompanhar ativo/inativo como os ícones MD.
 */
export function TaxasIcon({ className }: { className?: string }) {
  return (
    <span
      role="img"
      aria-hidden
      className={`inline-block shrink-0 bg-current ${className ?? 'h-[1.05em] w-[1.05em]'}`}
      style={{
        WebkitMaskImage: 'url(/icons/taxas.svg)',
        maskImage: 'url(/icons/taxas.svg)',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
      }}
    />
  )
}
