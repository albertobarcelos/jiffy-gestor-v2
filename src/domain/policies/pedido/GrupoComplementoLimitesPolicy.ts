/**
 * Limites de seleção do grupo de complementos (cadastro: qtdMinima / qtdMaxima).
 * `qtdMaxima` 0 = sem teto. `qtdMinima` 0 = sem mínimo.
 */

export type GrupoComplementoLimites = {
  id: string
  nome: string
  qtdMinima: number
  qtdMaxima: number
}

export function parseQuantidadeLimiteGrupo(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.max(0, Math.floor(raw))
  }
  if (typeof raw === 'string' && raw.trim() !== '') {
    const n = Number(raw)
    if (Number.isFinite(n)) return Math.max(0, Math.floor(n))
  }
  return 0
}

/** `null` = sem teto (cadastro com máxima 0). */
export function limiteMaximoEfetivoGrupo(qtdMaxima: number): number | null {
  return qtdMaxima > 0 ? qtdMaxima : null
}

export function somarQuantidadeComplementosNoGrupo(
  quantidades: Record<string, number>,
  grupoId: string,
  override?: { key: string; quantidade: number }
): number {
  let total = 0
  const prefix = `${grupoId}-`
  for (const [key, qtd] of Object.entries(quantidades)) {
    if (!key.startsWith(prefix)) continue
    total += override?.key === key ? override.quantidade : Math.max(0, Math.floor(qtd))
  }
  return total
}

export function grupoComplementoAtingiuMaximo(
  grupo: Pick<GrupoComplementoLimites, 'qtdMaxima'>,
  quantidadeNoGrupo: number
): boolean {
  const maximo = limiteMaximoEfetivoGrupo(grupo.qtdMaxima)
  return maximo != null && quantidadeNoGrupo >= maximo
}

export function podeIncrementarComplementoNoGrupo(
  grupo: Pick<GrupoComplementoLimites, 'qtdMaxima'>,
  quantidadeNoGrupoAposIncremento: number
): boolean {
  const maximo = limiteMaximoEfetivoGrupo(grupo.qtdMaxima)
  if (maximo == null) return true
  return quantidadeNoGrupoAposIncremento <= maximo
}

export function mensagemMaximoGrupoComplemento(
  grupo: Pick<GrupoComplementoLimites, 'nome' | 'qtdMaxima'>
): string {
  return `Máximo de ${grupo.qtdMaxima} opção(ões) em "${grupo.nome}"`
}

export function mensagemMinimoGrupoComplemento(
  grupo: Pick<GrupoComplementoLimites, 'nome' | 'qtdMinima'>
): string {
  return `Selecione pelo menos ${grupo.qtdMinima} em "${grupo.nome}"`
}

export function validarLimitesGruposComplementosLancamento(
  grupos: GrupoComplementoLimites[],
  quantidades: Record<string, number>
): { valido: boolean; mensagem?: string } {
  for (const grupo of grupos) {
    const total = somarQuantidadeComplementosNoGrupo(quantidades, grupo.id)
    if (grupo.qtdMinima > 0 && total < grupo.qtdMinima) {
      return { valido: false, mensagem: mensagemMinimoGrupoComplemento(grupo) }
    }
    const maximo = limiteMaximoEfetivoGrupo(grupo.qtdMaxima)
    if (maximo != null && total > maximo) {
      return { valido: false, mensagem: mensagemMaximoGrupoComplemento(grupo) }
    }
  }
  return { valido: true }
}
