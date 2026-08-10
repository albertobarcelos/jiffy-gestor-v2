'use client'

import type { DeliveryPublicoDesignConfig } from '../types/deliveryPublicoDesignConfig'
import { resolveGrupoTituloBarStyle } from '../utils/resolveGrupoTituloBarStyle'

type DeliveryGrupoTituloBarProps = {
  config: DeliveryPublicoDesignConfig
  nome: string
  imagemUrl?: string | null
  className?: string
}

/** Barra de título de grupo alinhada às preferências da aba Categorias. */
export function DeliveryGrupoTituloBar({
  config,
  nome,
  imagemUrl,
  className = 'mb-3',
}: DeliveryGrupoTituloBarProps) {
  const tituloStyle = resolveGrupoTituloBarStyle({
    config,
    imagemUrl,
  })
  const mostrarNome = config.categorias.mostrarNomeTitulo !== false

  return (
    <h2
      className={`delivery-grupo-title flex min-h-12 items-center rounded-lg px-4 py-2.5 text-base uppercase tracking-wide @sm:min-h-14 @sm:text-lg ${className}`}
      style={tituloStyle}
      aria-label={nome}
    >
      {mostrarNome ? (
        <span
          className="min-w-0 leading-tight"
          style={{ fontFamily: 'var(--delivery-font-title)' }}
        >
          {nome}
        </span>
      ) : null}
    </h2>
  )
}
