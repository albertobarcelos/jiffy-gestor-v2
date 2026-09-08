import type { CSSProperties } from 'react'
import type { DeliveryPublicoDesignConfig } from '../types/deliveryPublicoDesignConfig'

export type ResolveGrupoTituloBarStyleInput = {
  config: DeliveryPublicoDesignConfig
  /** URL do banner do grupo (quando modo imagem). */
  imagemUrl?: string | null
}

const FUNDO_TEMA = 'var(--delivery-primary-dark, #171717)'
const TEXTO_TEMA = 'var(--delivery-btn-text, #ffffff)'

/**
 * Estilo da barra de título do grupo no layout Básico.
 * Sempre mantém fundo sólido (tema ou personalizado). Com modo imagem + URL,
 * a imagem tem preferência por cima do sólido.
 */
export function resolveGrupoTituloBarStyle({
  config,
  imagemUrl,
}: ResolveGrupoTituloBarStyleInput): CSSProperties {
  const backgroundColor = config.categorias.corBarraTitulo?.trim() || FUNDO_TEMA
  const color = config.categorias.corTextoTitulo?.trim() || TEXTO_TEMA

  const usarImagem =
    config.categorias.tituloGrupoFundo === 'imagem' && Boolean(imagemUrl?.trim())

  if (!usarImagem) {
    return { backgroundColor, color }
  }

  return {
    backgroundColor,
    backgroundImage: `url(${imagemUrl!.trim()})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    color,
  }
}
