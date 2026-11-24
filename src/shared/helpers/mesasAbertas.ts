import { parseApiDateMs } from '@/src/shared/utils/formatters'
import type { MesaAbertaSummary } from '@/src/domain/types/mesasAbertas'

export const MESA_PARADA_MINUTOS = 15
export const COR_MESA_INICIAL = '#EEEFF5'
export const COR_MESA_FINAL = '#E6AA37'
export const COR_MESA_DUR_MIN_MS = MESA_PARADA_MINUTOS * 60 * 1000
export const COR_MESA_DUR_MAX_MS = 2 * 60 * 60 * 1000

/**
 * Parse padrão da API:
 * - com `Z`/offset → instante UTC
 * - sem fuso (ex.: compartilhador) → horário local
 */
export function toMsApiDate(value: Date | string): number {
  const ms = parseApiDateMs(value)
  return Number.isNaN(ms) ? Date.now() : ms
}

export function minutosDesdeApiDate(value: string, agoraMs: number = Date.now()): number {
  return Math.max(0, Math.floor((agoraMs - toMsApiDate(value)) / (1000 * 60)))
}

/** Última modificação, ou abertura se ela não vier. */
export function referenciaParadaMesa(
  venda: Pick<MesaAbertaSummary, 'dataUltimaModificacao' | 'dataCriacao'>
): string {
  return venda.dataUltimaModificacao && venda.dataUltimaModificacao.length > 0
    ? venda.dataUltimaModificacao
    : venda.dataCriacao
}

export function isMesaParada(
  venda: Pick<MesaAbertaSummary, 'dataUltimaModificacao' | 'dataCriacao'>,
  agoraMs: number = Date.now()
): boolean {
  return minutosDesdeApiDate(referenciaParadaMesa(venda), agoraMs) >= MESA_PARADA_MINUTOS
}

export function sortMesasByParadaAsc(
  items: MesaAbertaSummary[],
  agoraMs: number = Date.now()
): MesaAbertaSummary[] {
  return [...items].sort(
    (a, b) =>
      minutosDesdeApiDate(referenciaParadaMesa(a), agoraMs) -
      minutosDesdeApiDate(referenciaParadaMesa(b), agoraMs)
  )
}

export function filtrarMesasAbertasValidas(
  items: MesaAbertaSummary[],
  apenasSemMovimentacao: boolean,
  agoraMs: number = Date.now()
): MesaAbertaSummary[] {
  return items.filter(item => {
    if (item.dataCancelamento || item.dataFinalizacao) return false
    if (!apenasSemMovimentacao) return true
    return isMesaParada(item, agoraMs)
  })
}

function lerpColor(hexA: string, hexB: string, t: number): string {
  const toRGB = (hex: string) => {
    const n = parseInt(hex.replace('#', ''), 16)
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
  }
  const a = toRGB(hexA)
  const b = toRGB(hexB)
  const clamped = Math.max(0, Math.min(1, t))
  const mix = (x: number, y: number) => Math.round(x + (y - x) * clamped)
  return `#${[mix(a.r, b.r), mix(a.g, b.g), mix(a.b, b.b)]
    .map(v => v.toString(16).padStart(2, '0'))
    .join('')}`
}

export function getCorMesaPorTempo(
  tempoReferencia: Date | string,
  agoraMs: number = Date.now()
): string {
  const abertaMs = Math.max(0, agoraMs - toMsApiDate(tempoReferencia))
  if (abertaMs < COR_MESA_DUR_MIN_MS) return COR_MESA_INICIAL
  if (abertaMs >= COR_MESA_DUR_MAX_MS) return COR_MESA_FINAL
  const progresso = (abertaMs - COR_MESA_DUR_MIN_MS) / (COR_MESA_DUR_MAX_MS - COR_MESA_DUR_MIN_MS)
  return lerpColor(COR_MESA_INICIAL, COR_MESA_FINAL, progresso)
}

export function formatDiffTooltipMinutos(diffMinutes: number): string {
  if (diffMinutes < 60) return `${diffMinutes} min`
  const hours = Math.floor(diffMinutes / 60)
  const minutes = diffMinutes % 60

  if (hours < 24) {
    if (minutes === 0) return `${hours}h`
    return `${hours}h ${minutes} min`
  }

  const days = Math.floor(hours / 24)
  const remHours = hours % 24
  if (remHours === 0) return `${days} dia${days === 1 ? '' : 's'}`
  return `${days} dia${days === 1 ? '' : 's'} ${remHours}h`
}
