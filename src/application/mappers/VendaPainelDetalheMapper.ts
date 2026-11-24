import {
  atorUsuarioId,
  idUsuarioParaConsulta,
  rotuloAtorPedido,
} from '@/src/application/mappers/atorPedidoDelivery'
import type {
  MeioPagamentoPainelDTO,
  ProdutoLancadoPainelDTO,
  ResumoFiscalPainelDTO,
  TaxaLancadaPainelDTO,
  VendaPainelDetalheDTO,
} from '@/src/application/dto/VendaPainelDetalheDTO'

type UnknownRecord = Record<string, unknown>

export function tipoAjusteVendaInformado(tipo: unknown): boolean {
  if (tipo == null) return false
  const s = String(tipo).trim()
  if (s.length === 0) return false
  if (s.toLowerCase() === 'string') return false
  return true
}

export function extrairTipoEntregaDetalhe(
  raw: UnknownRecord
): 'entrega' | 'retirada' | null {
  const candidatos = [raw.tipoEntrega, raw.tipo_entrega, raw.tipoAtendimento, raw.tipo_atendimento]
  for (const candidato of candidatos) {
    const s = String(candidato ?? '')
      .trim()
      .toLowerCase()
    if (s === 'entrega' || s === 'retirada') return s
  }
  return null
}

export function tipoEhPercentual(tipo: unknown): boolean {
  const t = String(tipo ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  return (
    t === 'percentual' ||
    t === 'porcentagem' ||
    t === 'percentage' ||
    t.includes('percent')
  )
}

export function sufixoTituloAjusteVenda(tipo: unknown, valorConfigRaw: unknown): string {
  if (valorConfigRaw == null || valorConfigRaw === '') return ''
  const v =
    typeof valorConfigRaw === 'number'
      ? valorConfigRaw
      : Number(String(valorConfigRaw).replace(/\s/g, '').replace(',', '.'))
  if (!Number.isFinite(v)) return ''

  if (tipoEhPercentual(tipo)) {
    const pct = v >= 0 && v <= 1 ? Math.round(v * 100) : Math.round(v)
    return ` (${pct}%)`
  }
  return ` (${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v)})`
}

export function multiplicadorPercentualContrato(valorArmazenado: number): number {
  if (!Number.isFinite(valorArmazenado) || valorArmazenado < 0) return 0
  return valorArmazenado <= 1 ? valorArmazenado : valorArmazenado / 100
}

export function lerNumeroConfigAjusteVenda(raw: unknown): number | null {
  if (raw == null || raw === '') return null
  const n =
    typeof raw === 'number' ? raw : Number(String(raw).replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function lerNumeroCampoVendaRaiz(raw: UnknownRecord, ...keys: string[]): number {
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(raw, key)) continue
    const v = raw[key]
    if (v == null || v === '') continue
    const n = typeof v === 'number' ? v : Number(String(v).replace(/\s/g, '').replace(',', '.'))
    if (Number.isFinite(n)) return n
  }
  return 0
}

export function extrairAjustesTotaisVendaDaApi(dataRaw: UnknownRecord): {
  totalDesconto: number
  totalAcrescimo: number
  valorDesconto: number
  valorAcrescimo: number
  tipoDesconto: string | null
  tipoAcrescimo: string | null
} {
  const totalDesconto = lerNumeroCampoVendaRaiz(
    dataRaw,
    'totalDesconto',
    'TotalDesconto',
    'total_desconto'
  )
  const totalAcrescimo = lerNumeroCampoVendaRaiz(
    dataRaw,
    'totalAcrescimo',
    'TotalAcrescimo',
    'total_acrescimo'
  )
  const valorDesconto = lerNumeroCampoVendaRaiz(
    dataRaw,
    'valorDesconto',
    'ValorDesconto',
    'valor_desconto'
  )
  const valorAcrescimo = lerNumeroCampoVendaRaiz(
    dataRaw,
    'valorAcrescimo',
    'ValorAcrescimo',
    'valor_acrescimo'
  )

  const td = dataRaw.tipoDesconto ?? dataRaw.TipoDesconto ?? dataRaw.tipo_desconto
  const ta = dataRaw.tipoAcrescimo ?? dataRaw.TipoAcrescimo ?? dataRaw.tipo_acrescimo

  return {
    totalDesconto,
    totalAcrescimo,
    valorDesconto,
    valorAcrescimo,
    tipoDesconto: tipoAjusteVendaInformado(td) ? String(td).trim() : null,
    tipoAcrescimo: tipoAjusteVendaInformado(ta) ? String(ta).trim() : null,
  }
}

export function valorRaizPositivo(raw: unknown): number | null {
  if (raw == null || raw === '') return null
  const n =
    typeof raw === 'number'
      ? raw
      : Number(String(raw).replace(/\s/g, '').replace(',', '.'))
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

export function textoCampoFiscal(raw: unknown): string {
  if (raw == null || raw === '') return '—'
  return String(raw).trim() || '—'
}

export function normalizarResumoFiscal(raw: unknown): ResumoFiscalPainelDTO | undefined {
  if (raw == null) return undefined
  if (Array.isArray(raw)) {
    const primeiro = raw.find(item => item != null && typeof item === 'object')
    return primeiro ? normalizarResumoFiscal(primeiro) : undefined
  }
  if (typeof raw !== 'object') return undefined
  const r = raw as UnknownRecord

  const str = (key: string): string | null => {
    const v = r[key]
    if (v == null || v === '') return null
    return String(v).trim()
  }

  const numOrNull = (key: string): number | null => {
    const v = r[key]
    if (v == null || v === '') return null
    const n = typeof v === 'number' ? v : Number(v)
    return Number.isFinite(n) ? n : null
  }

  const numeroSerieRaw = r.numero ?? r.Numero
  const serieRaw = r.serie ?? r.Serie
  const id = str('id') ?? str('Id')
  if (!id) return undefined

  return {
    id,
    chaveFiscal: str('chaveFiscal') ?? str('ChaveFiscal'),
    codigoRetorno: str('codigoRetorno') ?? str('CodigoRetorno'),
    terminalId: str('terminalId') ?? str('TerminalId'),
    dataCriacao: str('dataCriacao') ?? str('DataCriacao'),
    dataEmissao: str('dataEmissao') ?? str('DataEmissao'),
    dataUltimaModificacao: str('dataUltimaModificacao') ?? str('DataUltimaModificacao'),
    documentoFiscalId: str('documentoFiscalId') ?? str('DocumentoFiscalId'),
    empresaId: str('empresaId') ?? str('EmpresaId'),
    modelo: numOrNull('modelo') ?? numOrNull('Modelo'),
    numero:
      numeroSerieRaw != null && numeroSerieRaw !== ''
        ? typeof numeroSerieRaw === 'number'
          ? numeroSerieRaw
          : String(numeroSerieRaw)
        : null,
    retornoSefaz: str('retornoSefaz') ?? str('RetornoSefaz'),
    serie:
      serieRaw != null && serieRaw !== ''
        ? typeof serieRaw === 'number'
          ? serieRaw
          : String(serieRaw)
        : null,
    status: str('status') ?? str('Status'),
    vendaId: str('vendaId') ?? str('VendaId'),
  }
}

export function statusFiscalEhEmitida(
  resumoStatus: string | null | undefined,
  statusNaVenda: string | null | undefined
): boolean {
  const r = resumoStatus != null ? String(resumoStatus).trim() : ''
  const u = statusNaVenda != null ? String(statusNaVenda).trim() : ''
  const s = (r !== '' ? r : u).toUpperCase()
  return s === 'EMITIDA'
}

export function vendaPossuiResumoFiscalParaAba(v: VendaPainelDetalheDTO | null): boolean {
  const rf = v?.resumoFiscal as unknown
  if (rf == null) return false
  if (Array.isArray(rf)) return rf.some(x => x != null && typeof x === 'object')
  if (typeof rf !== 'object') return false
  return Object.keys(rf as UnknownRecord).length > 0
}

export function nomeTerminalDeDetalhesApi(data: UnknownRecord): string | null {
  const raw =
    data.nome ??
    data.descricao ??
    data.codigoInterno ??
    data.codigo ??
    data.codigoTerminal ??
    data.code
  if (raw != null && String(raw).trim()) return String(raw).trim()
  return null
}

export function nomeEmpresaDeApi(data: UnknownRecord): string | null {
  const raw = data.nome ?? data.razaoSocial ?? data.nomeFantasia ?? data.name
  if (raw != null && String(raw).trim()) return String(raw).trim()
  return null
}

export function codigoTerminalDePayload(
  dataRaw: UnknownRecord,
  terminalDetalhes: UnknownRecord | null
): string {
  let codigo =
    String(
      dataRaw.codigoTerminal ||
        (dataRaw.terminal as UnknownRecord | undefined)?.codigo ||
        (dataRaw.terminal as UnknownRecord | undefined)?.codigoInterno ||
        (dataRaw.terminal as UnknownRecord | undefined)?.codigoTerminal ||
        (dataRaw.terminal as UnknownRecord | undefined)?.code ||
        dataRaw.terminalCodigo ||
        dataRaw.codigoInterno ||
        ''
    ).trim() || ''

  if (!codigo && terminalDetalhes) {
    codigo =
      String(
        terminalDetalhes.codigo ||
          terminalDetalhes.codigoInterno ||
          terminalDetalhes.codigoTerminal ||
          terminalDetalhes.code ||
          ''
      ).trim() || ''
  }

  if (!codigo && dataRaw.terminalId != null) {
    codigo = String(dataRaw.terminalId)
  }

  return codigo
}

function parseNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isNaN(parsed) ? null : parsed
}

function pickModifierValue(preferredRaw: unknown, fallbackRaw: unknown): number | undefined {
  const preferred = parseNumberOrNull(preferredRaw)
  const fallback = parseNumberOrNull(fallbackRaw)
  if (preferred !== null && preferred > 0) return preferred
  if (fallback !== null && fallback > 0) return fallback
  if (preferred !== null) return preferred
  if (fallback !== null) return fallback
  return undefined
}

export function idAtorOuPlano(ator: unknown, idPlano: unknown): string | undefined {
  const id = atorUsuarioId(ator) || String(idPlano ?? '').trim()
  return id || undefined
}

export function registrarNomeAtor(
  map: Record<string, string>,
  ator: unknown,
  idPlano?: unknown
): void {
  const id = atorUsuarioId(ator) || String(idPlano ?? '').trim()
  const rotulo = rotuloAtorPedido(ator)
  if (id && rotulo) map[id] = rotulo
}

function mapObservacoesProduto(produto: UnknownRecord): ProdutoLancadoPainelDTO['observacoes'] {
  const raw = produto.observacoesLancadas ?? produto.observacoes
  if (!Array.isArray(raw)) return undefined
  return raw
    .map(item => {
      if (typeof item === 'string') {
        const texto = item.trim()
        return texto ? { observacao: texto } : null
      }
      if (item && typeof item === 'object') {
        const rec = item as UnknownRecord
        const texto = String(rec.observacao ?? rec.texto ?? '').trim()
        if (!texto) return null
        return {
          id: rec.id != null ? String(rec.id) : undefined,
          observacao: texto,
        }
      }
      return null
    })
    .filter((item): item is { id?: string; observacao: string } => item !== null)
}

export function mapProdutosLancadosPainel(dataRaw: UnknownRecord): ProdutoLancadoPainelDTO[] {
  const rawList = (dataRaw.produtosLancados || dataRaw.produtos || []) as unknown[]
  if (!Array.isArray(rawList)) return []

  return rawList.map(produtoRaw => {
    const produto = (produtoRaw ?? {}) as UnknownRecord
    return {
      ...(produto as unknown as ProdutoLancadoPainelDTO),
      desconto: pickModifierValue(
        produto.valorDesconto ?? produto.descontoValor ?? produto.valorDescontoProduto,
        produto.desconto
      ),
      tipoDesconto:
        (produto.tipoDesconto as ProdutoLancadoPainelDTO['tipoDesconto']) ??
        (produto.tipoDescontoValor as ProdutoLancadoPainelDTO['tipoDesconto']) ??
        (produto.tipoDescontoProduto as ProdutoLancadoPainelDTO['tipoDesconto']) ??
        undefined,
      acrescimo: pickModifierValue(
        produto.valorAcrescimo ?? produto.acrescimoValor ?? produto.valorAcrescimoProduto,
        produto.acrescimo
      ),
      tipoAcrescimo:
        (produto.tipoAcrescimo as ProdutoLancadoPainelDTO['tipoAcrescimo']) ??
        (produto.tipoAcrescimoValor as ProdutoLancadoPainelDTO['tipoAcrescimo']) ??
        (produto.tipoAcrescimoProduto as ProdutoLancadoPainelDTO['tipoAcrescimo']) ??
        undefined,
      lancadoPorId: idAtorOuPlano(produto.lancadoPor, produto.lancadoPorId) ?? '',
      removidoPorId: idAtorOuPlano(produto.removidoPor, produto.removidoPorId),
      observacoes: mapObservacoesProduto(produto),
      complementos: Array.isArray(produto.complementos)
        ? (produto.complementos as ProdutoLancadoPainelDTO['complementos'])
        : [],
    }
  })
}

export function mapTaxasLancadasPainel(dataRaw: UnknownRecord): TaxaLancadaPainelDTO[] {
  if (!Array.isArray(dataRaw.taxasLancadas)) return []
  return dataRaw.taxasLancadas.map((t: UnknownRecord, idx: number) => ({
    id: String(t.id ?? `taxa-${idx}`),
    vendaId: t.vendaId != null ? String(t.vendaId) : undefined,
    taxaId: t.taxaId != null ? String(t.taxaId) : undefined,
    nome: String(t.nome ?? 'Taxa'),
    tipo: String(t.tipo ?? '—'),
    valor: Number(t.valor) || 0,
    quantidade: Number(t.quantidade) || 0,
    valorCalculado: Number(t.valorCalculado) || 0,
    lancadoAutomatico: Boolean(t.lancadoAutomatico),
    lancadoPorId: idAtorOuPlano(t.lancadoPor, t.lancadoPorId),
    removidoPorId: idAtorOuPlano(t.removidoPor, t.removidoPorId),
    dataLancamento: t.dataLancamento != null ? String(t.dataLancamento) : undefined,
    dataRemocao: t.dataRemocao != null ? String(t.dataRemocao) : undefined,
  }))
}

export function coletarNomesEmbutidos(dataRaw: UnknownRecord): Record<string, string> {
  const nomesEmbutidos: Record<string, string> = {}
  registrarNomeAtor(nomesEmbutidos, dataRaw.abertoPor, dataRaw.abertoPorId)
  registrarNomeAtor(nomesEmbutidos, dataRaw.ultimoResponsavel, dataRaw.ultimoResponsavelId)
  registrarNomeAtor(nomesEmbutidos, dataRaw.canceladoPor, dataRaw.canceladoPorId)

  const produtosRaw = (dataRaw.produtosLancados || dataRaw.produtos || []) as unknown[]
  if (Array.isArray(produtosRaw)) {
    for (const raw of produtosRaw) {
      if (!raw || typeof raw !== 'object') continue
      const produto = raw as UnknownRecord
      registrarNomeAtor(nomesEmbutidos, produto.lancadoPor, produto.lancadoPorId)
      registrarNomeAtor(nomesEmbutidos, produto.removidoPor, produto.removidoPorId)
    }
  }

  if (Array.isArray(dataRaw.taxasLancadas)) {
    for (const raw of dataRaw.taxasLancadas) {
      if (!raw || typeof raw !== 'object') continue
      const taxa = raw as UnknownRecord
      registrarNomeAtor(nomesEmbutidos, taxa.lancadoPor, taxa.lancadoPorId)
      registrarNomeAtor(nomesEmbutidos, taxa.removidoPor, taxa.removidoPorId)
    }
  }

  if (Array.isArray(dataRaw.pagamentos)) {
    for (const raw of dataRaw.pagamentos) {
      if (!raw || typeof raw !== 'object') continue
      const pag = raw as UnknownRecord
      registrarNomeAtor(nomesEmbutidos, pag.realizadoPor, pag.realizadoPorId)
      registrarNomeAtor(nomesEmbutidos, pag.canceladoPor, pag.canceladoPorId)
    }
  }
  return nomesEmbutidos
}

export function mapVendaPainelDetalheFromApi(input: {
  dataRaw: UnknownRecord
  codigoTerminal: string
  tipoEntregaLista?: 'entrega' | 'retirada' | null
}): VendaPainelDetalheDTO {
  const { dataRaw, codigoTerminal, tipoEntregaLista } = input
  const produtosLancados = mapProdutosLancadosPainel(dataRaw)
  const taxasLancadas = mapTaxasLancadasPainel(dataRaw)
  const ajusteVendaApi = extrairAjustesTotaisVendaDaApi(dataRaw)
  const rawResumoFiscal =
    dataRaw.resumoFiscal ?? dataRaw.ResumoFiscal ?? dataRaw.resumo_fiscal
  const resumoFiscalNorm = normalizarResumoFiscal(rawResumoFiscal)

  const pagamentosRaw = Array.isArray(dataRaw.pagamentos) ? dataRaw.pagamentos : []
  const pagamentos = pagamentosRaw.map((pag: UnknownRecord) => ({
    meioPagamentoId: String(pag.meioPagamentoId ?? ''),
    valor: Number(pag.valor) || 0,
    dataCriacao: String(pag.dataCriacao ?? ''),
    realizadoPorId: idAtorOuPlano(pag.realizadoPor, pag.realizadoPorId) ?? '',
    canceladoPorId: idAtorOuPlano(pag.canceladoPor, pag.canceladoPorId),
    cancelado: Boolean(pag.cancelado) || Boolean(pag.dataCancelamento),
    dataCancelamento: pag.dataCancelamento != null ? String(pag.dataCancelamento) : undefined,
    isTefUsed: pag.isTefUsed != null ? Boolean(pag.isTefUsed) : undefined,
    isTefConfirmed: pag.isTefConfirmed != null ? Boolean(pag.isTefConfirmed) : undefined,
    bandeiraCartao: pag.bandeiraCartao != null ? String(pag.bandeiraCartao) : null,
    codigoAutorizacao: pag.codigoAutorizacao != null ? String(pag.codigoAutorizacao) : null,
  }))

  return {
    ...(dataRaw as unknown as VendaPainelDetalheDTO),
    id: String(dataRaw.id ?? ''),
    numeroVenda: Number(dataRaw.numeroVenda) || 0,
    codigoVenda: String(dataRaw.codigoVenda ?? ''),
    valorFinal: Number(dataRaw.valorFinal) || 0,
    tipoVenda: String(dataRaw.tipoVenda ?? ''),
    abertoPorId: String(dataRaw.abertoPorId ?? ''),
    terminalId: String(dataRaw.terminalId ?? ''),
    dataCriacao: String(dataRaw.dataCriacao ?? ''),
    tipoEntrega: extrairTipoEntregaDetalhe(dataRaw) ?? tipoEntregaLista ?? null,
    codigoTerminal,
    statusFiscal: (dataRaw.statusFiscal as string | null | undefined) ?? null,
    documentoFiscalId: (dataRaw.documentoFiscalId as string | null | undefined) ?? null,
    retornoSefaz: (dataRaw.retornoSefaz as string | null | undefined) ?? null,
    produtosLancados,
    taxasLancadas,
    pagamentos,
    totalDesconto: ajusteVendaApi.totalDesconto,
    totalAcrescimo: ajusteVendaApi.totalAcrescimo,
    valorDesconto: ajusteVendaApi.valorDesconto,
    valorAcrescimo: ajusteVendaApi.valorAcrescimo,
    tipoDesconto: ajusteVendaApi.tipoDesconto,
    tipoAcrescimo: ajusteVendaApi.tipoAcrescimo,
    ...(resumoFiscalNorm != null ? { resumoFiscal: resumoFiscalNorm } : {}),
  }
}

export function mapMeioPagamentoPainel(
  meioId: string,
  data: UnknownRecord | null
): MeioPagamentoPainelDTO | null {
  if (!data) return null
  return {
    id: meioId,
    nome: String(data.nome ?? data.name ?? 'Sem nome'),
    formaPagamentoFiscal: String(data.formaPagamentoFiscal ?? data.formaPagamento ?? ''),
  }
}

export function nomeUsuarioDePayload(data: UnknownRecord | null): string | null {
  if (!data) return null
  const nome = data.nome ?? data.name
  if (typeof nome === 'string' && nome.trim()) return nome.trim()
  return null
}

export function nomeClienteDePayload(data: UnknownRecord | null): string | null {
  if (!data) return null
  const nome = data.nome ?? data.name
  if (typeof nome === 'string' && nome.trim()) return nome.trim()
  return null
}

export { idUsuarioParaConsulta }
