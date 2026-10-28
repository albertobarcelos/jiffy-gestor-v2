/** Largura alinhada à coluna de nome do catálogo (~34ch). */
export const NOME_CATALOGO_LISTA_MAX_CHARS = 34

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
