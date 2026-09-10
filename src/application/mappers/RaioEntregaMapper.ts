import {
  raioEntregaDTOValidator,
  type RaioEntregaDTO,
} from '@/src/application/dto/delivery/CoberturaEntregaDTO'

function normalizarRaioEntrega(raw: unknown): RaioEntregaDTO | null {
  if (!raw || typeof raw !== 'object') return null
  const parsed = raioEntregaDTOValidator.safeParse(raw)
  if (!parsed.success) return null
  return parsed.data
}

/** Normaliza lista de `GET /delivery/empresas/me/raios-entrega`. */
export function normalizarListaRaiosEntrega(payload: unknown): RaioEntregaDTO[] {
  let items: unknown[] = []
  if (Array.isArray(payload)) {
    items = payload
  } else if (payload && typeof payload === 'object') {
    const o = payload as Record<string, unknown>
    if (Array.isArray(o.items)) items = o.items
    else if (Array.isArray(o.data)) items = o.data
  }

  return items
    .map(normalizarRaioEntrega)
    .filter((item): item is RaioEntregaDTO => item !== null)
}

export function normalizarRaioEntregaResposta(payload: unknown): RaioEntregaDTO | null {
  return normalizarRaioEntrega(payload)
}

export function temRaioEntregaAtivo(raios: RaioEntregaDTO[]): boolean {
  return raios.some(r => r.ativo)
}
