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

/**
 * `cause` deve ser o objeto de exceção original (ex: o `e` capturado no `catch`).
 * Passá-lo como argumento separado ao `console.error` garante que o DevTools
 * exiba o stack trace real — objetos não-Error lançados pelo QZ Tray têm
 * propriedades não-enumeráveis que o spread `{ ...e }` perde completamente.
 */
export function erroImpressao(
  etapa: string,
  detalhes?: Record<string, unknown>,
  cause?: unknown
): void {
  if (!logAtivo()) return
  if (cause !== undefined) {
    console.error(PREFIX, { ...base(etapa), ...detalhes }, cause)
  } else {
    console.error(PREFIX, { ...base(etapa), ...detalhes })
  }
}
