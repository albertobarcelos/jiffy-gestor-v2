/** Constantes de formulário do pedido (UI), sem regra de negócio. */

export const TEMPOS_PREVISTOS_ENTREGA = [30, 45, 60, 75, 90, 120]
export const SEM_ENTREGADOR_VALUE = '__sem_entregador__'
export const SEM_TAXA_ENTREGA_VALUE = '__sem_taxa_entrega__'
export const ULTIMO_ENTREGADOR_STORAGE_KEY = 'jiffy:delivery:last-entregador-id'

export function getUltimoEntregadorSelecionado(): string {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(ULTIMO_ENTREGADOR_STORAGE_KEY) ?? ''
}

export function setUltimoEntregadorSelecionado(entregadorId: string): void {
  if (typeof window === 'undefined') return
  if (entregadorId) {
    window.localStorage.setItem(ULTIMO_ENTREGADOR_STORAGE_KEY, entregadorId)
  }
}
