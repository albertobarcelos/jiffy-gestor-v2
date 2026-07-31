/** Grupo sintético de favoritos no cardápio público. */
export const DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID = '__sugestoes__'

/** Nome reservado do grupo real no gestor (portador da imagem / gate de exibição). */
export const DELIVERY_PUBLICO_GRUPO_SUGESTOES_NOME = 'Sugestões da Casa'

/** Ícone MDI fallback para chips/visual do grupo Sugestões. */
export const DELIVERY_PUBLICO_GRUPO_SUGESTOES_ICON = 'star'

/**
 * Normaliza nome de grupo só para comparação (Sugestões da Casa).
 * Ignora acentos, caixa e espaços extras — no gestor costuma vir sem acento e em MAIÚSCULA.
 */
export function normalizeNomeGrupoComparacao(nome: string): string {
  return nome
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
}

/** True se o nome do grupo é o reservado "Sugestões da Casa" (com ou sem acento / maiúsculas). */
export function isNomeGrupoSugestoesDaCasa(nome: string): boolean {
  return (
    normalizeNomeGrupoComparacao(nome) ===
    normalizeNomeGrupoComparacao(DELIVERY_PUBLICO_GRUPO_SUGESTOES_NOME)
  )
}

/** Grupo real no cardápio usado como portador da imagem / liberação da seção. */
export function findGrupoSugestoesDaCasaCarrier<T extends { id: string; nome: string }>(
  grupos: T[]
): T | undefined {
  return grupos.find(
    grupo =>
      isNomeGrupoSugestoesDaCasa(grupo.nome) &&
      grupo.id !== DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID
  )
}

/** Remove o grupo real "Sugestões da Casa" da listagem normal. */
export function omitGrupoSugestoesDaCasaCarrier<T extends { id: string; nome: string }>(
  grupos: T[]
): T[] {
  return grupos.filter(
    grupo =>
      !(
        isNomeGrupoSugestoesDaCasa(grupo.nome) &&
        grupo.id !== DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID
      )
  )
}
