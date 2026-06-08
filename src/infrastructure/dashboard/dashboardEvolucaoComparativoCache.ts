const CACHE_TTL_MS = 90_000

export type LinhaComparacaoChartRow = {
  labelEixo: string
  finalizadasAtual: number
  canceladasAtual: number
  finalizadasAnterior: number
  canceladasAnterior: number
}

export type EvolucaoPoint = {
  data: string
  label: string
  valorFinalizadas: number
  valorCanceladas: number
}

export type EvolucaoComparativoCacheEntry = {
  expiresAt: number
  atual: EvolucaoPoint[]
  anterior: EvolucaoPoint[] | null
  merged: LinhaComparacaoChartRow[]
  comparativoPronto: boolean
}

type GlobalCache = typeof globalThis & {
  __jiffyDashboardEvolucaoComparativoCache?: Map<string, EvolucaoComparativoCacheEntry>
}

function getStore(): Map<string, EvolucaoComparativoCacheEntry> {
  const g = globalThis as GlobalCache
  if (!g.__jiffyDashboardEvolucaoComparativoCache) {
    g.__jiffyDashboardEvolucaoComparativoCache = new Map()
  }
  return g.__jiffyDashboardEvolucaoComparativoCache
}

export function buildEvolucaoComparativoCacheKey(input: {
  empresaId: string
  periodo: string
  timezone: string
  intervaloCustomKey: string
  intervaloHora: number | null
}): string {
  return [
    input.empresaId,
    input.periodo,
    input.timezone,
    input.intervaloCustomKey,
    input.intervaloHora ?? '',
  ].join('|')
}

export function getEvolucaoComparativoCache(key: string): EvolucaoComparativoCacheEntry | null {
  const hit = getStore().get(key)
  if (!hit) return null
  if (Date.now() > hit.expiresAt) {
    getStore().delete(key)
    return null
  }
  return hit
}

export function setEvolucaoComparativoCache(
  key: string,
  entry: Omit<EvolucaoComparativoCacheEntry, 'expiresAt'>
): void {
  getStore().set(key, { ...entry, expiresAt: Date.now() + CACHE_TTL_MS })
}
