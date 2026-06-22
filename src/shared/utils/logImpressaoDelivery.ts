/**
 * Rastreio do fluxo impressão delivery no console (DevTools).
 * Desative com `NEXT_PUBLIC_JIFFY_LOG_IMPRESSAO=false` no build.
 */
const PREFIX = '[Jiffy][Impressão]'

function logAtivo(): boolean {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_JIFFY_LOG_IMPRESSAO === 'false') {
    return false
  }
  return true
}

function base(etapa: string) {
  return { etapa, ts: new Date().toISOString() }
}

export function logImpressao(etapa: string, detalhes?: Record<string, unknown>): void {
  if (!logAtivo()) return
  if (detalhes && Object.keys(detalhes).length > 0) {
    console.info(PREFIX, { ...base(etapa), ...detalhes })
  } else {
    console.info(PREFIX, base(etapa))
  }
}

export function warnImpressao(etapa: string, detalhes?: Record<string, unknown>): void {
  if (!logAtivo()) return
  console.warn(PREFIX, { ...base(etapa), ...detalhes })
}

export function erroImpressao(etapa: string, detalhes?: Record<string, unknown>): void {
  if (!logAtivo()) return
  console.error(PREFIX, { ...base(etapa), ...detalhes })
}
