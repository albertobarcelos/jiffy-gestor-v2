export type VariantePilulaProducao = 'senha' | 'identidade' | 'codigo'

/** Porta da application: gera PNG da pílula sem conhecer canvas/DOM. */
export type DesenharPilulaProducao = (
  texto: string,
  variante: VariantePilulaProducao
) => string | null
