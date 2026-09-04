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

/** Delivery: Novos + Com NF ficam de fora até o operador voltar a marcar. */
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

/** Gestor web: só o padrão do modo. Flow: preferência do operador. */
export function resolverColunasOcultasKanban(
  kiosk: boolean,
  modo: ModoKanbanVendas,
  ocultasPersistidas: readonly ColunaKanbanId[]
): ColunaKanbanId[] {
  if (!kiosk) return colunasOcultasPadraoDoModo(modo)
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
