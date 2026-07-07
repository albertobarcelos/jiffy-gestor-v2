import type {
  ModoImpressaoDelivery,
  PreferenciasImpressaoDelivery,
} from '@/src/shared/types/deliveryImpressao'
import { DEFAULT_PREFERENCIAS_IMPRESSAO_DELIVERY } from '@/src/shared/types/deliveryImpressao'

function str(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t.length ? t : null
}

function bool(v: unknown, fallback: boolean): boolean {
  if (typeof v === 'boolean') return v
  if (v === 'true' || v === '1') return true
  if (v === 'false' || v === '0') return false
  return fallback
}

function numCopiasUnificado(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback
}

function idNullable(v: unknown): string | null {
  if (v == null || v === '') return null
  const s = String(v).trim()
  return s.length > 0 ? s : null
}

/** Mesma ideia do backend: trim + lower; valores inválidos → unificado (compatível com dados legados). */
function modoNormalizado(v: unknown): ModoImpressaoDelivery {
  const s = typeof v === 'string' ? v.trim().toLowerCase() : ''
  if (s === 'separado') return 'separado'
  return 'unificado'
}

/**
 * Extrai preferências de impressão delivery.
 * Fonte canônica: `parametroDelivery` em `GET /api/delivery/empresas/me`.
 * Mantém fallback em `GET /api/empresas/me` (legado).
 */
export function parsePreferenciasImpressaoDelivery(
  data: Record<string, unknown>
): PreferenciasImpressaoDelivery {
  const paramDelivery = (data.parametroDelivery ?? data.parametro_delivery) as
    | Record<string, unknown>
    | undefined
  const paramEmpresa = (data.parametroEmpresa ?? data.parametro_empresa) as
    | Record<string, unknown>
    | undefined
  const root = data
  const pick = (k: string): unknown =>
    paramDelivery?.[k] ??
    paramDelivery?.[snake(k)] ??
    paramEmpresa?.[k] ??
    root[k] ??
    paramEmpresa?.[snake(k)] ??
    root[snake(k)]

  const modoImp = modoNormalizado(
    pick('modoImpressaoDelivery') ?? pick('modo_impressao_delivery')
  )

  const copias = numCopiasUnificado(
    pick('copiasCupomUnificado') ??
      pick('copias_cupom_unificado') ??
      pick('copiasCupomDelivery') ??
      pick('copias_iniciar_preparo') ??
      pick('copiasIniciarPreparo'),
    DEFAULT_PREFERENCIAS_IMPRESSAO_DELIVERY.copiasCupomUnificado
  )

  const imprimirReceber = bool(
    pick('imprimirAoReceber') ??
      pick('imprimir_ao_receber') ??
      pick('impressaoAutomaticaPreparoUnificado') ??
      pick('impressao_automatica_preparo_unificado'),
    DEFAULT_PREFERENCIAS_IMPRESSAO_DELIVERY.imprimirAoReceber
  )

  const imprimirPronto = bool(
    pick('imprimirAoFicarPronto') ??
      pick('imprimir_ao_ficar_pronto') ??
      pick('impressaoAutomaticaExpedicaoSeparado') ??
      pick('impressao_automatica_expedicao_separado') ??
      pick('impressaoAutomaticaMarcarProntoSeparado'),
    DEFAULT_PREFERENCIAS_IMPRESSAO_DELIVERY.imprimirAoFicarPronto
  )

  const impressoraExpedicaoId = idNullable(pick('impressoraExpedicaoId') ?? pick('impressora_expedicao_id'))

  const envPadrao =
    typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_QZ_PRINTER_DEFAULT?.trim()
      ? process.env.NEXT_PUBLIC_QZ_PRINTER_DEFAULT.trim()
      : null

  return {
    modo: modoImp,
    copiasCupomUnificado: copias,
    autoIniciarPreparoNovosPedidos: bool(
      pick('autoIniciarPreparoNovosPedidos') ?? pick('auto_iniciar_preparo_novos_pedidos'),
      DEFAULT_PREFERENCIAS_IMPRESSAO_DELIVERY.autoIniciarPreparoNovosPedidos
    ),
    imprimirAoReceber: imprimirReceber,
    imprimirAoFicarPronto: imprimirPronto,
    impressoraExpedicaoId,
    impressoraPadraoNome: envPadrao,
  }
}

function snake(k: string): string {
  return k.replace(/[A-Z]/g, m => `_${m.toLowerCase()}`)
}
