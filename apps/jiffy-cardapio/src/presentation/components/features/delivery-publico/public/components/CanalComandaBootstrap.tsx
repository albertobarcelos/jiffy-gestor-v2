'use client'

import { useEffect } from 'react'
import { useCanalCardapioStore } from '../../shared/stores/canalCardapioStore'

type Props = {
  codigo: string
  children: React.ReactNode
}

/** Ao abrir `/{slug}/comanda/{codigo}`, fixa o canal `comanda` na sessão. */
export function CanalComandaBootstrap({ codigo, children }: Props) {
  const setCanalComanda = useCanalCardapioStore(s => s.setCanalComanda)

  useEffect(() => {
    if (codigo.trim()) {
      setCanalComanda(codigo)
    }
  }, [codigo, setCanalComanda])

  return (
    <>
      <div
        className="sticky top-0 z-40 border-b px-3 py-2 text-center text-sm font-medium"
        style={{
          background: 'var(--delivery-primary, #333)',
          color: 'var(--delivery-on-primary, #fff)',
        }}
      >
        Comanda {codigo}
        <span className="ml-2 opacity-80">(canal reservado — conta aberta em breve)</span>
      </div>
      {children}
    </>
  )
}
