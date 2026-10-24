/** Janela anti-duplicata entre impressão local, abas do mesmo PC e comando Socket.IO. */
export const IMPRESSAO_DELIVERY_DEDUPE_TTL_MS = 20_000

export type TipoDedupeImpressaoDelivery = 'comando' | 'expedicao'

const STORAGE_KEY = 'jiffy-impressao-delivery-recente'
const recentes = new Map<string, number>()

function chave(vendaId: string, tipo: TipoDedupeImpressaoDelivery): string {
  return tipo === 'comando' ? vendaId : `${tipo}:${vendaId}`
}

function hidratarDoStorage(): void {
  if (typeof localStorage === 'undefined') return
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as Record<string, unknown>
    for (const [id, at] of Object.entries(parsed)) {
      if (typeof at !== 'number' || !Number.isFinite(at)) continue
      const atual = recentes.get(id)
      if (atual == null || at > atual) recentes.set(id, at)
    }
  } catch {
    /* ignore */
  }
}

function persistir(): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(recentes)))
  } catch {
    /* ignore */
  }
}

function limparExpirados(now: number): void {
  hidratarDoStorage()
  for (const [id, at] of recentes) {
    if (now - at > IMPRESSAO_DELIVERY_DEDUPE_TTL_MS) {
      recentes.delete(id)
    }
  }
}

export function jaImprimiuDeliveryRecentemente(
  vendaId: string,
  now: number = Date.now(),
  tipo: TipoDedupeImpressaoDelivery = 'comando'
): boolean {
  const id = vendaId.trim()
  if (!id) return false
  limparExpirados(now)
  const at = recentes.get(chave(id, tipo))
  if (at == null) return false
  return now - at <= IMPRESSAO_DELIVERY_DEDUPE_TTL_MS
}

export function marcarImpressaoDeliveryRecente(
  vendaId: string,
  now: number = Date.now(),
  tipo: TipoDedupeImpressaoDelivery = 'comando'
): void {
  const id = vendaId.trim()
  if (!id) return
  limparExpirados(now)
  recentes.set(chave(id, tipo), now)
  persistir()
}

/** Apenas testes. */
export function limparDedupeImpressaoDelivery(): void {
  recentes.clear()
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
