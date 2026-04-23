/**
 * Intervalo por data de finalização na API `/api/v1/operacao-pdv/vendas`.
 * Aceita os nomes novos e mantém fallback para `periodoInicial`/`periodoFinal` (legado).
 */
export function lerIntervaloFinalizacaoVendasPdv(searchParams: URLSearchParams): {
  inicial: string
  final: string
} | null {
  const inicial =
    searchParams.get('dataFinalizacaoInicial')?.trim() ||
    searchParams.get('periodoInicial')?.trim() ||
    ''
  const final =
    searchParams.get('dataFinalizacaoFinal')?.trim() ||
    searchParams.get('periodoFinal')?.trim() ||
    ''
  if (!inicial || !final) return null
  return { inicial, final }
}

/** Envia para o PDV apenas os parâmetros oficiais de finalização. */
export function appendIntervaloFinalizacaoVendasPdv(
  params: URLSearchParams,
  intervalo: { inicial: string; final: string }
): void {
  params.append('dataFinalizacaoInicial', intervalo.inicial)
  params.append('dataFinalizacaoFinal', intervalo.final)
}
