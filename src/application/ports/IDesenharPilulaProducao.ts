export type VariantePilulaProducao = 'senha' | 'identidade' | 'codigo'

/** Porta da application: gera PNG da pílula sem conhecer canvas/DOM. */
export type DesenharPilulaProducao = (
  texto: string,
  variante: VariantePilulaProducao
) => string | null

export type ParteMolduraIdentidade = 'topo' | 'base'

/** Só o contorno pontilhado (teto/base). O texto da identidade continua ESC/POS. */
export type DesenharMolduraIdentidade = (parte: ParteMolduraIdentidade) => string | null
