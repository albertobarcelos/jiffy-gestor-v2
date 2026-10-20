/** Alias de transporte (PDV/API) → valor canônico de origem. */
export function canonicalizarAliasOrigemApi(raw: unknown): string {
  const s = String(raw ?? '').trim().toUpperCase()
  if (s === 'DELIVERY_IFOOD') return 'IFOOD'
  return s
}
