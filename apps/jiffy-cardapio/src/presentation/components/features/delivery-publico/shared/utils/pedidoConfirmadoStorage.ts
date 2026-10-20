import type { GeoJsonPoint } from '@/src/shared/types/geoJsonPoint'
import type { PedidoPublicoConfirmadoSnapshot } from '@/src/application/mappers/PedidoPublicoConfirmadoMapper'

const STORAGE_PREFIX = 'jiffy-cardapio:pedido-confirmado:'

export type PedidoPublicoConfirmadoPersistido = {
  version: 1
  slug: string
  codigo: string
  savedAt: string
  snapshot: PedidoPublicoConfirmadoSnapshot
  meta: {
    telefoneEmpresa: string | null
    nomeEmpresa: string | null
    localizacaoEmpresa: GeoJsonPoint | null
  }
}

function storageKey(slug: string, codigo: string): string {
  return `${STORAGE_PREFIX}${slug.trim().toLowerCase()}:${codigo.trim()}`
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function salvarPedidoPublicoConfirmado(
  slug: string,
  codigo: string,
  data: Omit<PedidoPublicoConfirmadoPersistido, 'version' | 'slug' | 'codigo' | 'savedAt'>
): void {
  if (!isBrowser()) return
  const codigoNorm = codigo.trim()
  const slugNorm = slug.trim()
  if (!codigoNorm || !slugNorm) return

  const payload: PedidoPublicoConfirmadoPersistido = {
    version: 1,
    slug: slugNorm,
    codigo: codigoNorm,
    savedAt: new Date().toISOString(),
    snapshot: data.snapshot,
    meta: data.meta,
  }

  try {
    window.localStorage.setItem(storageKey(slugNorm, codigoNorm), JSON.stringify(payload))
  } catch {
    // Quota / private mode — ignora; a página só terá o snapshot se a navegação imediata ainda tiver state.
  }
}

export function lerPedidoPublicoConfirmado(
  slug: string,
  codigo: string
): PedidoPublicoConfirmadoPersistido | null {
  if (!isBrowser()) return null
  const codigoNorm = codigo.trim()
  const slugNorm = slug.trim()
  if (!codigoNorm || !slugNorm) return null

  try {
    const raw = window.localStorage.getItem(storageKey(slugNorm, codigoNorm))
    if (!raw) return null
    const parsed = JSON.parse(raw) as PedidoPublicoConfirmadoPersistido
    if (parsed?.version !== 1 || !parsed.snapshot) return null
    return parsed
  } catch {
    return null
  }
}

/** Pedidos confirmados deste slug neste dispositivo (mais recente primeiro). */
export function listarPedidosPublicoConfirmadosPorSlug(
  slug: string
): PedidoPublicoConfirmadoPersistido[] {
  if (!isBrowser()) return []
  const slugNorm = slug.trim().toLowerCase()
  if (!slugNorm) return []

  const prefix = `${STORAGE_PREFIX}${slugNorm}:`
  const out: PedidoPublicoConfirmadoPersistido[] = []

  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i)
      if (!key?.startsWith(prefix)) continue
      const raw = window.localStorage.getItem(key)
      if (!raw) continue
      try {
        const parsed = JSON.parse(raw) as PedidoPublicoConfirmadoPersistido
        if (parsed?.version !== 1 || !parsed.snapshot || !parsed.codigo) continue
        out.push(parsed)
      } catch {
        // ignora entrada inválida
      }
    }
  } catch {
    return []
  }

  return out.sort((a, b) => {
    const ta = Date.parse(a.savedAt) || 0
    const tb = Date.parse(b.savedAt) || 0
    return tb - ta
  })
}

/** Último pedido confirmado deste slug neste dispositivo. */
export function lerUltimoPedidoPublicoConfirmado(
  slug: string
): PedidoPublicoConfirmadoPersistido | null {
  return listarPedidosPublicoConfirmadosPorSlug(slug)[0] ?? null
}
