/** Constantes de formulário do pedido (UI), sem regra de negócio. */

export const TEMPOS_PREVISTOS_ENTREGA = [30, 45, 60, 75, 90, 120]
export const SEM_ENTREGADOR_VALUE = '__sem_entregador__'
export const SEM_TAXA_ENTREGA_VALUE = '__sem_taxa_entrega__'

/** @deprecated Prefira chave com empresa + filtro via `storageKeyUltimoEntregador`. */
export const ULTIMO_ENTREGADOR_STORAGE_KEY = 'jiffy:delivery:last-entregador-id'

/**
 * Escopo do “último entregador” lembrado no terminal.
 * - `empresaId`: evita misturar tenants na mesma aba/máquina
 * - `filtroTipo`: alinhado ao filtro/tipo do pedido (`entrega` | `retirada` | …)
 */
export function storageKeyUltimoEntregador(
  empresaId: string | null | undefined,
  filtroTipo?: string | null
): string {
  const empresa = String(empresaId ?? '').trim() || 'sem-empresa'
  const tipo = String(filtroTipo ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
  const tipoKey = tipo || 'todos'
  return `${ULTIMO_ENTREGADOR_STORAGE_KEY}:${empresa}:${tipoKey}`
}

export function normalizarFiltroTipoEntregador(
  tipoVenda: string | null | undefined
): 'entrega' | 'retirada' | 'todos' {
  const t = String(tipoVenda ?? '')
    .trim()
    .toLowerCase()
  if (t === 'entrega' || t === 'delivery') return 'entrega'
  if (t === 'retirada') return 'retirada'
  return 'todos'
}

export function getUltimoEntregadorSelecionado(
  empresaId?: string | null,
  filtroTipo?: string | null
): string {
  if (typeof window === 'undefined') return ''
  const key = storageKeyUltimoEntregador(empresaId, filtroTipo)
  const scoped = window.localStorage.getItem(key)?.trim()
  if (scoped) return scoped
  // Migração legada (sem escopo de empresa/filtro)
  if (!empresaId) {
    return window.localStorage.getItem(ULTIMO_ENTREGADOR_STORAGE_KEY)?.trim() ?? ''
  }
  return ''
}

export function setUltimoEntregadorSelecionado(
  entregadorId: string,
  empresaId?: string | null,
  filtroTipo?: string | null
): void {
  if (typeof window === 'undefined') return
  const id = String(entregadorId ?? '').trim()
  if (!id) return
  window.localStorage.setItem(storageKeyUltimoEntregador(empresaId, filtroTipo), id)
}
