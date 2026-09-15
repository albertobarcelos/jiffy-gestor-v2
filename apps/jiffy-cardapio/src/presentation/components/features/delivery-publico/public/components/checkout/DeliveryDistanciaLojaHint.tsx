'use client'

type DeliveryDistanciaLojaHintProps = {
  texto: string | null | undefined
  className?: string
}

/** Hint discreto da distância aproximada (linha reta) até a loja. */
export function DeliveryDistanciaLojaHint({
  texto,
  className = 'mt-0.5 text-[10px] leading-tight delivery-text-secondary',
}: DeliveryDistanciaLojaHintProps) {
  if (!texto) return null
  return <p className={className}>{texto}</p>
}
