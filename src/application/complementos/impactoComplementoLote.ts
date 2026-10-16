import type { TipoImpactoPreco } from '@/src/domain/complemento/tipos'
import { normalizarTipoImpactoPreco } from '@/src/domain/complemento/tipos'
import type { ImpactoComplementoNoGrupo } from '@/src/domain/repositories/IComplementoOverrideRepository'
import { compararNomePt } from '@/src/application/complementos/menuComplementoLote'
import { LIMITE_VINCULOS_OVERRIDE, partirEmLotes } from '@/src/application/complementos/valorComplementoLote'

/** Mesmo teto do PATCH de overrides (vinculos ou grupos). */
export const LIMITE_OVERRIDES_PATCH = LIMITE_VINCULOS_OVERRIDE

export const TIPOS_IMPACTO_LOTE = [
  { id: 'nenhum' as const, label: 'Nenhum' },
  { id: 'aumenta' as const, label: 'Aumenta' },
  { id: 'diminui' as const, label: 'Diminui' },
]

export type ComplementoNoGrupoImpactoLote = {
  id: string
  nome: string
  tipoImpactoPreco: TipoImpactoPreco
}

export type GrupoImpactoLote = {
  id: string
  nome: string
  ativo: boolean
  complementos: ComplementoNoGrupoImpactoLote[]
}

/** Uma linha = um par grupo×complemento (pode repetir o nome do complemento). */
export type LinhaImpactoLote = {
  chave: string
  grupoId: string
  grupoNome: string
  complementoId: string
  complementoNome: string
  tipoImpactoPreco: TipoImpactoPreco
}

export function chaveLinhaImpactoLote(grupoId: string, complementoId: string): string {
  return `${grupoId}:${complementoId}`
}

/** Extrai complementos com impacto efetivo do payload do GET do grupo. */
export function lerComplementosImpactoDoGrupo(raw: unknown): ComplementoNoGrupoImpactoLote[] {
  if (!Array.isArray(raw)) return []
  const itens: ComplementoNoGrupoImpactoLote[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const registro = item as Record<string, unknown>
    const id = registro.id != null ? String(registro.id) : ''
    const nome = registro.nome != null ? String(registro.nome) : ''
    if (!id || !nome) continue
    itens.push({
      id,
      nome,
      tipoImpactoPreco: normalizarTipoImpactoPreco(registro.tipoImpactoPreco),
    })
  }
  return itens.sort((a, b) => compararNomePt(a.nome, b.nome))
}

/** Monta a visão de grupo a partir do JSON do GET `/api/grupos-complementos/:id`. */
export function montarGrupoImpactoLoteDeJson(data: unknown): GrupoImpactoLote | null {
  if (!data || typeof data !== 'object') return null
  const registro = data as Record<string, unknown>
  const id = registro.id != null ? String(registro.id) : ''
  const nome = registro.nome != null ? String(registro.nome) : ''
  if (!id || !nome) return null
  return {
    id,
    nome,
    ativo: registro.ativo === true || registro.ativo === 'true',
    complementos: lerComplementosImpactoDoGrupo(registro.complementos),
  }
}

/**
 * Lista uma linha por vínculo complemento×grupo.
 * Ordena por nome do complemento e, em empate, pelo nome do grupo.
 */
export function listarLinhasImpactoLote(
  grupos: ReadonlyArray<GrupoImpactoLote>
): LinhaImpactoLote[] {
  const linhas: LinhaImpactoLote[] = []
  const vistos = new Set<string>()

  for (const grupo of grupos) {
    for (const complemento of grupo.complementos) {
      const chave = chaveLinhaImpactoLote(grupo.id, complemento.id)
      if (vistos.has(chave)) continue
      vistos.add(chave)
      linhas.push({
        chave,
        grupoId: grupo.id,
        grupoNome: grupo.nome,
        complementoId: complemento.id,
        complementoNome: complemento.nome,
        tipoImpactoPreco: complemento.tipoImpactoPreco,
      })
    }
  }

  return linhas.sort((a, b) => {
    const porComplemento = compararNomePt(a.complementoNome, b.complementoNome)
    if (porComplemento !== 0) return porComplemento
    return compararNomePt(a.grupoNome, b.grupoNome)
  })
}

/** Monta o payload PATCH a partir das chaves `grupoId:complementoId` marcadas. */
export function montarParesImpactoLote(
  linhas: ReadonlyArray<LinhaImpactoLote>,
  chavesSelecionadas: ReadonlySet<string>,
  tipoImpactoPreco: TipoImpactoPreco
): ImpactoComplementoNoGrupo[] {
  const vistos = new Set<string>()
  const pares: ImpactoComplementoNoGrupo[] = []

  for (const linha of linhas) {
    if (!chavesSelecionadas.has(linha.chave)) continue
    if (vistos.has(linha.chave)) continue
    vistos.add(linha.chave)
    pares.push({
      grupoComplementoId: linha.grupoId,
      complementoId: linha.complementoId,
      tipoImpactoPreco,
    })
  }

  return pares
}

export function partirParesImpactoEmLotes(
  pares: ReadonlyArray<ImpactoComplementoNoGrupo>
): ImpactoComplementoNoGrupo[][] {
  return partirEmLotes(pares, LIMITE_OVERRIDES_PATCH)
}
