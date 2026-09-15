const NOMES_MEIO_PAGAMENTO_CACHE = new Map<string, string>()

export function lembrarNomeMeioPagamento(meioId: string, nome: string): void {
  const id = meioId.trim()
  const rotulo = nome.trim()
  if (!id || !rotulo) return
  NOMES_MEIO_PAGAMENTO_CACHE.set(id, rotulo)
}

export function obterNomeMeioPagamentoCache(meioId: string): string | null {
  const id = meioId.trim()
  if (!id) return null
  return NOMES_MEIO_PAGAMENTO_CACHE.get(id) ?? null
}

export function mesclarNomesMeiosPagamentoCache(mapa: Record<string, string>): void {
  for (const [id, nome] of Object.entries(mapa)) {
    lembrarNomeMeioPagamento(id, nome)
  }
}

export function snapshotNomesMeiosPagamentoCache(): Record<string, string> {
  return Object.fromEntries(NOMES_MEIO_PAGAMENTO_CACHE.entries())
}
