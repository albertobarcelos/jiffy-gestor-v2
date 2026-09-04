import {
  areaEntregaDTOValidator,
  type AreaEntregaDTO,
} from '@/src/application/dto/delivery/CoberturaEntregaDTO'

function normalizarAreaEntrega(raw: unknown): AreaEntregaDTO | null {
  if (!raw || typeof raw !== 'object') return null
  const parsed = areaEntregaDTOValidator.safeParse(raw)
  if (!parsed.success) return null
  return parsed.data
}

/** Normaliza lista de `GET /delivery/empresas/me/areas-entrega`. */
export function normalizarListaAreasEntrega(payload: unknown): AreaEntregaDTO[] {
  let items: unknown[] = []
  if (Array.isArray(payload)) {
    items = payload
  } else if (payload && typeof payload === 'object') {
    const o = payload as Record<string, unknown>
    if (Array.isArray(o.items)) items = o.items
    else if (Array.isArray(o.data)) items = o.data
  }

  return items
    .map(normalizarAreaEntrega)
    .filter((item): item is AreaEntregaDTO => item !== null)
}

export function normalizarAreaEntregaResposta(payload: unknown): AreaEntregaDTO | null {
  return normalizarAreaEntrega(payload)
}

export function temAreaEntregaAtiva(areas: AreaEntregaDTO[]): boolean {
  return areas.some(a => a.ativo)
}
