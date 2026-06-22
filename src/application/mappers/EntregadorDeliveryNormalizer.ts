import type { UsuarioPdvEntregadorOption } from '@/src/domain/types/vendaDetalhe'

function normalizarEntregadorDeliveryOption(raw: unknown): UsuarioPdvEntregadorOption | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const id = String(row.id ?? '').trim()
  const nome = String(row.nome ?? '').trim()
  if (!id || !nome) return null
  return {
    id,
    nome,
    telefone: row.telefone != null ? String(row.telefone) : undefined,
  }
}

/** Normaliza lista paginada ou array de `GET /delivery/entregadores`. */
export function normalizarListaEntregadoresDelivery(payload: unknown): UsuarioPdvEntregadorOption[] {
  let items: unknown[] = []
  if (Array.isArray(payload)) {
    items = payload
  } else if (payload && typeof payload === 'object') {
    const o = payload as Record<string, unknown>
    if (Array.isArray(o.items)) items = o.items
    else if (Array.isArray(o.data)) items = o.data
  }

  return items
    .map(normalizarEntregadorDeliveryOption)
    .filter((item): item is UsuarioPdvEntregadorOption => item !== null)
}
