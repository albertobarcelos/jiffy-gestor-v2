export const NOME_CATALOGO_LISTA_MAX_CHARS = 25

export function truncarNomeCatalogoLista(
  nome: string,
  maxChars = NOME_CATALOGO_LISTA_MAX_CHARS
): { exibicao: string; truncado: boolean } {
  const truncado = nome.length > maxChars
  return {
    truncado,
    exibicao: truncado ? `${nome.slice(0, maxChars)}…` : nome,
  }
}
