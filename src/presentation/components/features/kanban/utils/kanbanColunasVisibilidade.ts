import type { SuperficieQuadroPedidos } from '@/src/presentation/gestor-pedidos/superficieQuadroPedidos'
import type { ColunaKanbanId, KanbanColumn } from '../types'
import type { ModoKanbanVendas } from '../KanbanModoVendasToggle'

export const COLUNAS_KANBAN_IDS: readonly ColunaKanbanId[] = [
  'NOVOS_PEDIDOS',
  'EM_PREPARO',
  'PRONTO_ENTREGA',
  'EM_ROTA',
  'FINALIZADAS',
  'PENDENTE_EMISSAO',
  'COM_FISCAL',
  'REJEITADAS',
]

/** Fredy (Flow): Novos + Com NF ficam de fora até o operador voltar a marcar. O Gestor web não usa isto. */
export const COLUNAS_OCULTAS_PADRAO_DELIVERY: readonly ColunaKanbanId[] = [
  'NOVOS_PEDIDOS',
  'COM_FISCAL',
]

export function isColunaKanbanId(value: string): value is ColunaKanbanId {
  return (COLUNAS_KANBAN_IDS as readonly string[]).includes(value)
}

export function sanitizarColunasOcultas(ids: unknown): ColunaKanbanId[] {
  if (!Array.isArray(ids)) return []
  const vistos = new Set<ColunaKanbanId>()
  const out: ColunaKanbanId[] = []
  for (const item of ids) {
    if (typeof item !== 'string' || !isColunaKanbanId(item) || vistos.has(item)) continue
    vistos.add(item)
    out.push(item)
  }
  return out
}

export function colunasOcultasPadraoDoModo(modo: ModoKanbanVendas): ColunaKanbanId[] {
  return modo === 'delivery' ? [...COLUNAS_OCULTAS_PADRAO_DELIVERY] : []
}

/**
 * Gestor: todas as etapas do modo.
 * Fredy: preferência do operador — por padrão esconde Novos + Com NF no delivery.
 */
export function resolverColunasOcultasKanban(
  superficie: SuperficieQuadroPedidos,
  ocultasPersistidas: readonly ColunaKanbanId[]
): ColunaKanbanId[] {
  if (superficie === 'gestor') return []
  return [...ocultasPersistidas]
}

/**
 * Tira colunas marcadas como ocultas. Nunca esvazia o quadro (fica a primeira).
 */
export function aplicarColunasOcultas(
  colunas: KanbanColumn[],
  ocultas: readonly ColunaKanbanId[]
): KanbanColumn[] {
  if (colunas.length === 0) return colunas
  const set = new Set(ocultas)
  const visiveis = colunas.filter(c => !set.has(c.id as ColunaKanbanId))
  return visiveis.length > 0 ? visiveis : [colunas[0]]
}

export function podeOcultarColuna(
  colunasDoModo: readonly KanbanColumn[],
  ocultas: readonly ColunaKanbanId[],
  id: ColunaKanbanId
): boolean {
  const visiveis = aplicarColunasOcultas([...colunasDoModo], ocultas)
  if (visiveis.length <= 1 && visiveis[0]?.id === id) return false
  if (visiveis.length <= 1 && !ocultas.includes(id)) return false
  return true
}

export function alternarColunaOculta(
  ocultas: readonly ColunaKanbanId[],
  id: ColunaKanbanId,
  tornarVisivel: boolean
): ColunaKanbanId[] {
  if (tornarVisivel) {
    return ocultas.filter(item => item !== id)
  }
  if (ocultas.includes(id)) return [...ocultas]
  return [...ocultas, id]
}
