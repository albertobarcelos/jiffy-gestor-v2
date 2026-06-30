import { Produto } from '@/src/domain/entities/Produto'
import { FILTRO_COLUNA_TODOS } from '../constants'
import type { FiltroColunaVazia, TabPainelLote } from '../types'

/** Verdadeiro quando o produto não possui dado na coluna do filtro escolhido. */
export function produtoSemDadoNaColuna(p: Produto, filtro: FiltroColunaVazia): boolean {
  if (filtro === FILTRO_COLUNA_TODOS) return true
  switch (filtro) {
    case 'sem_impressoras':
      return p.getImpressoras().length === 0
    case 'sem_ncm':
      return !p.getNcm().trim()
    case 'sem_grupos_complementos':
      return p.getGruposComplementos().length === 0
    default:
      return true
  }
}

/** Filtro "sem dado em…" só faz sentido para colunas visíveis na aba atual. */
export function filtrosDisponiveisPorAba(tab: TabPainelLote): FiltroColunaVazia[] {
  const r: FiltroColunaVazia[] = [FILTRO_COLUNA_TODOS]
  if (tab === 'impressoras') r.push('sem_impressoras')
  if (tab === 'gruposComplementos') r.push('sem_grupos_complementos')
  if (tab === 'fiscal') r.push('sem_ncm')
  return r
}
