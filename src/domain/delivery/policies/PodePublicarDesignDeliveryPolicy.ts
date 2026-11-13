const LAYOUTS_PUBLICAVEIS = new Set(['basico', 'vitrine', 'grade', 'catalogo'])

const PALETAS_PUBLICAVEIS = new Set([
  'carvao',
  'lavanda',
  'mirtilo',
  'pessego',
  'canela',
  'cereja',
  'gergelim',
  'hortela',
  'chocolate',
  'mostarda',
  'personalizada',
])

const TIPOGRAFIAS_PUBLICAVEIS = new Set(['urbana', 'moderna', 'classica', 'elegante'])

export type DesignPublicavel = {
  layoutId: string
  cores: { paletaId: string }
  tipografia: { presetId: string }
}

export class PodePublicarDesignDeliveryPolicy {
  static check(config: DesignPublicavel): boolean {
    return (
      LAYOUTS_PUBLICAVEIS.has(config.layoutId) &&
      PALETAS_PUBLICAVEIS.has(config.cores.paletaId) &&
      TIPOGRAFIAS_PUBLICAVEIS.has(config.tipografia.presetId)
    )
  }

  static assert(config: DesignPublicavel): void {
    if (!LAYOUTS_PUBLICAVEIS.has(config.layoutId)) {
      throw new Error('Modelo de layout não pode ser publicado no momento')
    }
    if (!PALETAS_PUBLICAVEIS.has(config.cores.paletaId)) {
      throw new Error('Paleta não pode ser publicada no momento')
    }
    if (!TIPOGRAFIAS_PUBLICAVEIS.has(config.tipografia.presetId)) {
      throw new Error('Tipografia não pode ser publicada no momento')
    }
  }
}
