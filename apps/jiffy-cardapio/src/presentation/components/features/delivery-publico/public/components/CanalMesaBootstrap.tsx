'use client'

import { useEffect } from 'react'
import { useCanalCardapioStore } from '../../shared/stores/canalCardapioStore'

type Props = {
  mesaId: string
  tablet?: boolean
  children: React.ReactNode
}

/**
 * Ao abrir `/{slug}/mesa/{id}`, fixa o canal `mesa` (e opcionalmente tablet).
 * O cardápio/checkout ainda usam o fluxo de entrega/retirada até o backend
 * aceitar mesa no create — o contexto já fica reservado na sessão.
 */
export function CanalMesaBootstrap({ mesaId, tablet, children }: Props) {
  const setCanalMesa = useCanalCardapioStore(s => s.setCanalMesa)

  useEffect(() => {
    if (mesaId.trim()) {
      setCanalMesa(mesaId, { tablet })
    }
  }, [mesaId, tablet, setCanalMesa])

  return (
    <>
      <div
        className="sticky top-0 z-40 border-b px-3 py-2 text-center text-sm font-medium"
        style={{
          background: 'var(--delivery-primary, #333)',
          color: 'var(--delivery-on-primary, #fff)',
        }}
      >
        {tablet ? 'Tablet · ' : 'QR · '}
        Mesa {mesaId}
        <span className="ml-2 opacity-80">(canal reservado — pedido na mesa em breve)</span>
      </div>
      {children}
    </>
  )
}
