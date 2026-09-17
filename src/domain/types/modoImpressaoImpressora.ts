/**
 * Modo de via de produção da impressora (`impressora_terminal_map.modo_impressao`).
 * Independente de `modoImpressaoDelivery` (unificado/separado) e de `modoPapel` (texto/gráfico).
 */
export const MODOS_IMPRESSAO_IMPRESSORA = ['normal', 'agrupado', 'porUnidade', 'ficha'] as const

export type ModoImpressaoImpressora = (typeof MODOS_IMPRESSAO_IMPRESSORA)[number]

export const MODO_IMPRESSAO_IMPRESSORA_OPCOES: ReadonlyArray<{
  valor: ModoImpressaoImpressora
  label: string
  hint: string
}> = [
  {
    valor: 'normal',
    label: 'Normal',
    hint: 'Via de produção com os itens como foram lançados.',
  },
  {
    valor: 'agrupado',
    label: 'Agrupado',
    hint: 'Soma itens totalmente equivalentes em uma única via.',
  },
  {
    valor: 'porUnidade',
    label: 'Por unidade',
    hint: 'Uma via por unidade. Gera conferência quando houver mais de uma via.',
  },
  {
    valor: 'ficha',
    label: 'Ficha',
    hint: 'Ticket com QR para eventos. No delivery é tratado como Normal.',
  },
]

export type ImpressoraTerminalModo = {
  ativo?: boolean | string
  terminalId?: unknown
  estacaoId?: unknown
  estacaoImpressaoId?: unknown
  modoImpressao?: unknown
  modoFicha?: unknown
}

function ehModoImpressaoImpressora(value: string): value is ModoImpressaoImpressora {
  return (MODOS_IMPRESSAO_IMPRESSORA as readonly string[]).includes(value)
}

/**
 * Espelha o PDV `getModoImpressaoByString` + backend `resolveModos`:
 * `modoImpressao` prevalece; senão `modoFicha` true vira `ficha`; senão `normal`.
 * Valores desconhecidos caem em `normal` (não quebrar impressão delivery).
 */
export function parseModoImpressaoImpressora(
  value: unknown,
  modoFicha = false
): ModoImpressaoImpressora {
  const normalized = String(value ?? '').trim()
  if (normalized && ehModoImpressaoImpressora(normalized)) {
    return normalized
  }
  return modoFicha ? 'ficha' : 'normal'
}

function modoFichaDoTerminal(terminal: ImpressoraTerminalModo): boolean {
  return terminal.modoFicha === true || terminal.modoFicha === 'true'
}

export function idEstacaoDoTerminal(terminal: ImpressoraTerminalModo): string {
  return String(terminal.terminalId ?? terminal.estacaoId ?? terminal.estacaoImpressaoId ?? '').trim()
}

/**
 * Modo desta impressora nesta estação (`impressora_terminal_map`).
 * Sem o par estação+impressora → `normal`. Não infere a partir de outras estações.
 */
export function resolverModoImpressaoDaEstacao(
  terminais: ImpressoraTerminalModo[] | null | undefined,
  estacaoId?: string | null
): ModoImpressaoImpressora {
  const id = String(estacaoId ?? '').trim()
  if (!id || !terminais?.length) return 'normal'
  const match = terminais.find(t => idEstacaoDoTerminal(t) === id)
  if (!match) return 'normal'
  return parseModoImpressaoImpressora(match.modoImpressao, modoFichaDoTerminal(match))
}

type MapeamentoComModo = {
  impressoraId?: string | null
  modoImpressao?: unknown
  modo_impressao?: unknown
  modoFicha?: unknown
  modo_ficha?: unknown
}

function modoFichaDeMapeamento(raw: MapeamentoComModo): boolean {
  return (
    raw.modoFicha === true ||
    raw.modoFicha === 'true' ||
    raw.modo_ficha === true ||
    raw.modo_ficha === 'true'
  )
}

/** Presente no JSON da estação/instruções; `undefined` se o backend omitiu o campo. */
export function modoImpressaoDeMapeamentoOpcional(
  raw: MapeamentoComModo | null | undefined
): ModoImpressaoImpressora | undefined {
  if (!raw) return undefined
  const modoRaw = raw.modoImpressao ?? raw.modo_impressao
  const ficha = modoFichaDeMapeamento(raw)
  if (modoRaw == null || String(modoRaw).trim() === '') {
    return ficha ? 'ficha' : undefined
  }
  return parseModoImpressaoImpressora(modoRaw, ficha)
}

export function modosImpressaoPorImpressoraIdDeMapeamentos(
  mapeamentos: Array<MapeamentoComModo> | null | undefined
): Record<string, ModoImpressaoImpressora> {
  const result: Record<string, ModoImpressaoImpressora> = {}
  if (!mapeamentos?.length) return result
  for (const mapeamento of mapeamentos) {
    const id = String(mapeamento.impressoraId ?? '').trim()
    if (!id) continue
    const modo = modoImpressaoDeMapeamentoOpcional(mapeamento)
    if (modo) result[id] = modo
  }
  return result
}

export function modoFichaDerivado(modo: ModoImpressaoImpressora): boolean {
  return modo === 'ficha'
}
