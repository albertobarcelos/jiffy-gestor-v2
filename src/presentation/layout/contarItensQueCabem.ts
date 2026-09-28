/**
 * Quantos itens da barra cabem sem sobrepor o bloco da direita.
 * Se a soma não cabe, reserva espaço para o botão "Mais".
 */
export function contarItensQueCabem(
  larguras: number[],
  disponivel: number,
  larguraMais: number,
  gap = 0
): number {
  const total = larguras.length
  if (total === 0 || disponivel <= 0) {
    return 0
  }

  const larguraNaFaixa = (indice: number) => larguras[indice] + (indice > 0 ? gap : 0)

  let somaTodos = 0
  for (let indice = 0; indice < total; indice += 1) {
    somaTodos += larguraNaFaixa(indice)
  }
  if (somaTodos <= disponivel) {
    return total
  }

  let usado = 0
  for (let indice = 0; indice < total; indice += 1) {
    const item = larguraNaFaixa(indice)
    const precisaMais = indice < total - 1
    const extraMais = precisaMais ? gap + larguraMais : 0
    if (usado + item + extraMais > disponivel) {
      return indice
    }
    usado += item
  }

  return total
}
