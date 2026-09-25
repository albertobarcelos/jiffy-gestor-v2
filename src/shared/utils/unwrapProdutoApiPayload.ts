/**
 * GET `/api/produtos/:id` (e similares) às vezes vem como `{ data: produto }`.
 * Normaliza para o objeto do produto quando o nest parece um produto.
 */
export function unwrapProdutoApiPayload(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw
  const obj = raw as Record<string, unknown>
  const nested = obj.data
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    const n = nested as Record<string, unknown>
    if (
      n.id != null ||
      n.nome != null ||
      n.grupoId != null ||
      n.grupo != null ||
      n.gruposComplementos != null
    ) {
      return nested
    }
  }
  return raw
}

/** Variante para formulários: nunca retorna null/array — objeto vazio se inválido. */
export function unwrapProdutoApiPayloadAsRecord(raw: unknown): Record<string, unknown> {
  const unwrapped = unwrapProdutoApiPayload(raw)
  if (!unwrapped || typeof unwrapped !== 'object' || Array.isArray(unwrapped)) return {}
  return unwrapped as Record<string, unknown>
}
