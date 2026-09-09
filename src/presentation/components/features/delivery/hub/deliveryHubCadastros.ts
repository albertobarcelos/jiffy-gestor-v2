export type DeliveryHubPassosExtras = {
  whatsappConectado?: boolean
  qtdEntregadores?: number
  qtdMeiosPagamento?: number
  qtdImpressoras?: number
}

export function contarItensListaHub(payload: unknown): number {
  if (Array.isArray(payload)) return payload.length
  if (!payload || typeof payload !== 'object') return 0
  const row = payload as Record<string, unknown>
  if (typeof row.count === 'number' && Number.isFinite(row.count) && row.count >= 0) {
    return row.count
  }
  if (Array.isArray(row.items)) return row.items.length
  if (Array.isArray(row.data)) return row.data.length
  return 0
}

export function textoQuantidadeCadastrada(
  quantidade: number,
  opcoes: { nenhum: string; um: string; muitos: (n: number) => string }
): string {
  if (quantidade <= 0) return opcoes.nenhum
  if (quantidade === 1) return opcoes.um
  return opcoes.muitos(quantidade)
}
