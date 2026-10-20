export type TerminalTaxaConfigPatch = {
  terminalId: string
  ativo: boolean
  automatico: boolean
  mesa: boolean
  balcao: boolean
}

export type CamposPatchTaxaEntrega = {
  nome: string
  valor: number
  ativo: boolean
}

export type PayloadPatchTaxaEntrega = {
  nome: string
  valor: number
  tipo: 'entrega'
  ativo: boolean
  tributado: boolean
  ncm: string | null
  dataAtualizacao: string
  terminaisConfig?: TerminalTaxaConfigPatch[]
}

export function terminaisConfigDoDetalheTaxa(
  detalhe: Record<string, unknown>
): TerminalTaxaConfigPatch[] | undefined {
  const raw = detalhe.terminaisConfig
  if (!Array.isArray(raw)) return undefined
  const items = raw
    .map(item => {
      if (!item || typeof item !== 'object') return null
      const o = item as Record<string, unknown>
      const terminalId = o.terminalId != null ? String(o.terminalId) : ''
      if (!terminalId) return null
      return {
        terminalId,
        ativo: o.ativo === true || o.ativo === 'true',
        automatico: o.automatico === true || o.automatico === 'true',
        mesa: o.mesa === true || o.mesa === 'true',
        balcao: o.balcao === true || o.balcao === 'true',
      }
    })
    .filter((item): item is TerminalTaxaConfigPatch => item != null)
  return items.length > 0 ? items : undefined
}

/**
 * PATCH de taxa de entrega: preserva tributado, NCM e terminais do GET.
 */
export function montarPayloadPatchTaxaEntrega(
  detalhe: Record<string, unknown>,
  campos: CamposPatchTaxaEntrega,
  agora: Date = new Date()
): PayloadPatchTaxaEntrega {
  const dataAtualizacao =
    typeof detalhe.dataAtualizacao === 'string' && detalhe.dataAtualizacao
      ? detalhe.dataAtualizacao
      : agora.toISOString()
  const ncmRaw = detalhe.ncm
  const ncm =
    ncmRaw === null || ncmRaw === undefined || ncmRaw === '' ? null : String(ncmRaw)

  return {
    nome: campos.nome,
    valor: campos.valor,
    tipo: 'entrega',
    ativo: campos.ativo,
    tributado: detalhe.tributado === true || detalhe.tributado === 'true',
    ncm,
    dataAtualizacao,
    terminaisConfig: terminaisConfigDoDetalheTaxa(detalhe),
  }
}
