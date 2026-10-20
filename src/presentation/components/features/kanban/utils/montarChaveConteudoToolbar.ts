type ChaveConteudoToolbarInput = {
  periodoPreset: string
  periodoInicioMs: number | ''
  periodoFimMs: number | ''
  origem: string
  tipoEntrega: string
  tipoCanal: string
  terminal: string
  coluna: string
  modo: string
}

/** Chave estável para o hook de quebra reagir a mudança de filtro. */
export function montarChaveConteudoToolbar(input: ChaveConteudoToolbarInput): string {
  return [
    input.periodoPreset,
    input.periodoInicioMs,
    input.periodoFimMs,
    input.origem,
    input.tipoEntrega,
    input.tipoCanal,
    input.terminal,
    input.coluna,
    input.modo,
  ].join('|')
}
