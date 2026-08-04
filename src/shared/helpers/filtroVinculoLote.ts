/**
 * Fluxo reutilizável: filtrar catálogo para vincular/desvincular em lote.
 *
 * Usado por impressoras e grupos de complementos (AtualizarProdutosLote).
 * @see docs/arquitetura-jiffy/5.presentation/3.FLUXO_VINCULO_LOTE.md
 */

export type ModoVinculoLote = 'adicionar' | 'remover'

/**
 * União dos IDs já vinculados nos alvos selecionados
 * (ex.: impressoras/grupos presentes em pelo menos um produto marcado).
 */
export function uniaoIdsVinculosDosAlvos<TAlvo>(
  alvos: TAlvo[],
  idsAlvosSelecionados: Set<string>,
  getAlvoId: (alvo: TAlvo) => string,
  getVinculoIds: (alvo: TAlvo) => string[]
): Set<string> {
  const uniao = new Set<string>()
  for (const alvo of alvos) {
    if (!idsAlvosSelecionados.has(getAlvoId(alvo))) continue
    for (const id of getVinculoIds(alvo)) {
      uniao.add(id)
    }
  }
  return uniao
}

/**
 * Filtra o catálogo conforme o modo:
 * - sem alvos selecionados → lista completa (exploração)
 * - desvincular (remover) → só itens da união (já pertencem)
 * - vincular (adicionar) → só itens fora da união (ainda não pertencem)
 */
export function filtrarCatalogoPorModoVinculo<TItem>(
  catalogo: TItem[],
  getId: (item: TItem) => string,
  idsJaVinculados: Set<string>,
  modo: ModoVinculoLote,
  temAlvosSelecionados: boolean
): TItem[] {
  if (!temAlvosSelecionados) return catalogo

  if (modo === 'remover') {
    return catalogo.filter((item) => idsJaVinculados.has(getId(item)))
  }

  return catalogo.filter((item) => !idsJaVinculados.has(getId(item)))
}

export function ordenarCatalogoPorNome<TItem>(
  catalogo: TItem[],
  getNome: (item: TItem) => string,
  locale = 'pt-BR'
): TItem[] {
  return [...catalogo].sort((a, b) =>
    getNome(a).localeCompare(getNome(b), locale, { sensitivity: 'base' })
  )
}

export function filtrarCatalogoPorBuscaNome<TItem>(
  catalogo: TItem[],
  getNome: (item: TItem) => string,
  busca: string
): TItem[] {
  const termo = busca.trim().toLowerCase()
  if (!termo) return catalogo
  return catalogo.filter((item) => getNome(item).toLowerCase().includes(termo))
}

/** Remove da seleção IDs que saíram da lista visível do modo. */
export function podarSelecaoParaIdsPermitidos(
  selecionados: Set<string>,
  idsPermitidos: Set<string>
): Set<string> {
  let alterou = false
  const next = new Set<string>()
  for (const id of selecionados) {
    if (idsPermitidos.has(id)) next.add(id)
    else alterou = true
  }
  return alterou ? next : selecionados
}

export type TextosModoVinculoLote = {
  hintSemSelecao: string
  hintRemover: string
  hintAdicionar: string
  emptyRemover: string
  emptyAdicionar: string
}

export const TEXTOS_VINCULO_IMPRESSORAS: TextosModoVinculoLote = {
  hintSemSelecao: 'Selecione produtos para filtrar as impressoras',
  hintRemover: 'Mostrando só as vinculadas aos selecionados',
  hintAdicionar: 'Mostrando só as disponíveis para vincular',
  emptyRemover: 'Nenhuma impressora vinculada aos produtos selecionados',
  emptyAdicionar:
    'Nenhuma impressora disponível para vincular (todas já pertencem aos selecionados)',
}

export const TEXTOS_VINCULO_GRUPOS_COMPLEMENTOS: TextosModoVinculoLote = {
  hintSemSelecao: 'Selecione produtos para filtrar os grupos',
  hintRemover: 'Mostrando só os vinculados aos selecionados',
  hintAdicionar: 'Mostrando só os disponíveis para vincular',
  emptyRemover: 'Nenhum grupo vinculado aos produtos selecionados',
  emptyAdicionar:
    'Nenhum grupo disponível para vincular (todos já pertencem aos selecionados)',
}

export function textoHintModoVinculoLote(
  modo: ModoVinculoLote,
  temAlvosSelecionados: boolean,
  textos: TextosModoVinculoLote
): string {
  if (!temAlvosSelecionados) return textos.hintSemSelecao
  return modo === 'remover' ? textos.hintRemover : textos.hintAdicionar
}

export function textoEmptyModoVinculoLote(
  modo: ModoVinculoLote,
  textos: TextosModoVinculoLote
): string {
  return modo === 'remover' ? textos.emptyRemover : textos.emptyAdicionar
}
