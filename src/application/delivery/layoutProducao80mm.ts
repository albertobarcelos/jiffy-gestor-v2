/** Layout 80 mm ESC/POS da via de produção (espelha o print order do POS). */

export const PRODUCAO_80MM = {
  papelMm: 80 as const,
  larguraRasterPx: 576,
  colunasFonteA: 48,
  colunasFonteB: 64,
  colunasMeta: 64,
  colunasItemA22: 24,
  colunasComplementoB22: 32,
  /** Tipo + código + nome curto na mesma pílula (fonte 30 px). */
  identidadeMaxUmaLinha: 24,
  /** Nome sozinho na segunda pílula, sem encolher a fonte. */
  identidadeMaxNomePilula: 26,
  margemPilulaPx: 12,
  gapAbaixoPilulaPx: 10,
  raioPilulaPx: 2,
  /** Folga até a faca. 4 linhas ≈ 12 mm para o rodapé não ser cortado. */
  linhasAntesDoCorte: 4,
} as const

export function textoEscPosProducao(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[—–]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[’]/g, "'")
    .replace(/•/g, '*')
    .replace(/\s+/g, ' ')
    .trim()
}

export function quantidadeInteiraProducao(qtd: unknown): number {
  const n = typeof qtd === 'number' ? qtd : Number(qtd)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.floor(n)
}

export function prefixoQuantidadeItem(qtd: number): string {
  return `${quantidadeInteiraProducao(qtd)}x `
}

export function recuoComplementoEspacos(qtd: number): string {
  const prefixo = prefixoQuantidadeItem(qtd)
  const n = Math.max(1, Math.round((prefixo.length * 32) / 24))
  return ' '.repeat(n)
}

export function linhaItemProducao(qtd: number, nome: string): string {
  const nomeLimpo = textoEscPosProducao(nome).toUpperCase() || 'ITEM'
  if (quantidadeInteiraProducao(qtd) === 0) {
    return `${prefixoQuantidadeItem(0)}${nomeLimpo} (item ja lancado)`
  }
  return `${prefixoQuantidadeItem(qtd)}${nomeLimpo}`
}

export type ImpactoComplementoProducao = 'aumenta' | 'diminui' | 'nenhum'

export function impactoComplementoProducao(tipo?: string | null): ImpactoComplementoProducao {
  const raw = String(tipo ?? '').trim().toLowerCase()
  if (raw === 'aumenta' || raw.includes('aument')) return 'aumenta'
  if (raw === 'diminui' || raw.includes('dimin') || raw.includes('reduz')) return 'diminui'
  return 'nenhum'
}

export function linhaComplementoProducao(params: {
  recuo: string
  nome: string
  quantidade?: number
  impacto: ImpactoComplementoProducao
}): string {
  const nome = textoEscPosProducao(params.nome).toUpperCase()
  if (!nome) return ''
  const qtd = quantidadeInteiraProducao(params.quantidade ?? 1)
  if (params.impacto === 'aumenta') {
    return `${params.recuo}+ ${qtd} ${nome}`
  }
  if (params.impacto === 'diminui') {
    return `${params.recuo}- ${qtd} ${nome}`
  }
  return `${params.recuo}* ${qtd} ${nome}`
}

export function linhaObservacaoItemProducao(recuo: string, texto: string): string {
  const obs = textoEscPosProducao(texto)
  if (!obs) return ''
  return `${recuo}Obs: ${obs}`
}

export function horaPedidoProducao(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function linhaHoraAtendente(hora: string, atendente: string): string {
  const h = textoEscPosProducao(hora)
  const a = textoEscPosProducao(atendente)
  if (h && a) return `${h} | Atend: ${a}`
  if (h) return h
  if (a) return `Atend: ${a}`
  return ''
}

export type BaseIdentidadeProducao = 'MESA' | 'BALCAO' | 'ENTREGA' | 'RETIRADA'

export function baseIdentidadeProducao(tipoVenda?: string | null): BaseIdentidadeProducao {
  const raw = String(tipoVenda ?? '').trim().toLowerCase()
  if (raw.includes('mesa')) return 'MESA'
  if (raw.includes('balc')) return 'BALCAO'
  if (raw.includes('retir') || raw.includes('pickup') || raw.includes('take')) return 'RETIRADA'
  return 'ENTREGA'
}

export function textosIdentidadeProducao(params: {
  tipoVenda?: string | null
  codigoVenda?: string | null
  numeroMesa?: string | number | null
  identificacao?: string | null
  viaUnitaria?: boolean
}): { primaria: string; secundaria: string | null } {
  const base = baseIdentidadeProducao(params.tipoVenda)
  const codigo = textoEscPosProducao(String(params.codigoVenda ?? '')).toUpperCase()
  const mesa = textoEscPosProducao(String(params.numeroMesa ?? ''))
  const ident = textoEscPosProducao(params.identificacao ?? '').toUpperCase()

  let primaria = ''
  if (base === 'MESA') {
    primaria = mesa ? `MESA ${mesa}` : codigo ? `MESA #${codigo}` : 'MESA'
  } else if (params.viaUnitaria && codigo) {
    primaria = base
  } else {
    primaria = codigo ? `${base} #${codigo}` : base
  }

  if (!ident) return { primaria, secundaria: null }
  const sep = ' | '
  const combinada = `${primaria}${sep}${ident}`
  if (combinada.length <= PRODUCAO_80MM.identidadeMaxUmaLinha) {
    return { primaria: combinada, secundaria: null }
  }
  return {
    primaria,
    secundaria: cortarTextoParaLinha(ident, PRODUCAO_80MM.identidadeMaxNomePilula),
  }
}

export function cortarTextoParaLinha(texto: string, max: number): string {
  const t = textoEscPosProducao(texto).toUpperCase()
  if (max < 1) return ''
  if (t.length <= max) return t
  const corte = t.slice(0, max).trimEnd()
  const ultimoEspaco = corte.lastIndexOf(' ')
  if (ultimoEspaco >= 3) return corte.slice(0, ultimoEspaco)
  return corte
}

export function textoPilulaSenha(senha: string): string {
  const digits = senha.replace(/\D/g, '')
  if (!digits) return ''
  return `SENHA:  ${digits.split('').join(' ')}`
}

export function identidadePrimariaEhTipoAvulso(texto: string): boolean {
  const t = texto.trim().toUpperCase()
  return t === 'ENTREGA' || t === 'BALCAO' || t === 'RETIRADA' || t === 'MESA'
}

export function textoPilulaUnidade(codigo: string, index: number, total: number): string {
  const c = textoEscPosProducao(codigo).toUpperCase() || codigo
  return `#${c} - ${index} DE ${total}`
}

export function linhaResumoProducao(qtdItens: number, nomeImpressora?: string | null): string {
  const n = Math.max(0, Math.floor(qtdItens))
  const itens = n === 1 ? '1 ITEM' : `${n} ITENS`
  const nome = textoEscPosProducao(nomeImpressora ?? '')
  return nome ? `${itens} • ${nome}` : itens
}

export function partesRodapeProducao(params: {
  codigoVenda?: string | null
  versao?: string | null
  codigoTerminal?: string | null
}): string[] {
  const partes: string[] = []
  const codigo = textoEscPosProducao(String(params.codigoVenda ?? '')).toUpperCase()
  if (codigo) partes.push(`Venda #${codigo}`)
  const versao = textoEscPosProducao(String(params.versao ?? ''))
  if (versao) partes.push(`v${versao.replace(/^v/i, '')}`)
  const term = textoEscPosProducao(String(params.codigoTerminal ?? '')).toUpperCase()
  if (term) partes.push(`Term. #${term}`)
  const unida = partes.join(' | ')
  if (unida.length <= PRODUCAO_80MM.colunasMeta) return unida ? [unida] : []
  return partes
}

export type ItemModeloProducao80mm = {
  produto: string
  extras: string[]
}

export type OrigemLinhaItemPedido = NonNullable<
  NonNullable<OrigemModeloProducao80mm['itens']>[number]
>

export type OrigemComplementoItemPedido = NonNullable<
  NonNullable<OrigemLinhaItemPedido['complementos']>[number]
>

export type DetalheLinhasItemPedido = {
  produto: string
  complementos: Array<{ texto: string; origem: OrigemComplementoItemPedido }>
  observacao: string | null
}

export function detalheLinhasItemPedido(
  item: OrigemLinhaItemPedido,
  options?: { permitirQuantidadeZero?: boolean }
): DetalheLinhasItemPedido {
  const qtdRaw = quantidadeInteiraProducao(item.quantidade)
  const qtd = options?.permitirQuantidadeZero ? qtdRaw : qtdRaw > 0 ? qtdRaw : 1
  const recuo = recuoComplementoEspacos(qtd)
  const complementos: DetalheLinhasItemPedido['complementos'] = []
  for (const comp of item.complementos ?? []) {
    if (!comp) continue
    const texto = linhaComplementoProducao({
      recuo,
      nome: String(comp.nome || comp.descricao || ''),
      quantidade: quantidadeInteiraProducao(comp.impressao?.quantidade ?? comp.quantidade ?? 1),
      impacto: impactoComplementoProducao(comp.tipoImpactoPreco),
    })
    if (!texto) continue
    complementos.push({ texto, origem: comp })
  }
  const observacao = linhaObservacaoItemProducao(recuo, String(item.observacao ?? '')) || null
  return {
    produto: linhaItemProducao(qtd, String(item.nomeProduto ?? '')),
    complementos,
    observacao,
  }
}

export function montarLinhasItemPedido(
  item: OrigemLinhaItemPedido,
  options?: { permitirQuantidadeZero?: boolean }
): ItemModeloProducao80mm {
  const detalhe = detalheLinhasItemPedido(item, options)
  const extras = detalhe.complementos.map(comp => comp.texto)
  if (detalhe.observacao) extras.push(detalhe.observacao)
  return {
    produto: detalhe.produto,
    extras,
  }
}

export type ModeloProducao80mm = {
  reimpressao: boolean
  senha: string | null
  conferencia: boolean
  unidade: string | null
  identidade: { primaria: string; secundaria: string | null }
  itens: ItemModeloProducao80mm[]
  observacaoPedido: string | null
  resumo: string
  rodape: string[]
}

export type OrigemModeloProducao80mm = {
  tipoVenda?: string | null
  codigoVenda?: string | null
  numeroMesa?: string | number | null
  identificacao?: string | null
  senha?: string | number | null
  dataPedido?: string | null
  atendente?: string | null
  codigoTerminal?: string | null
  versao?: string | null
  nomeImpressora?: string | null
  observacaoPedido?: string | null
  reimpressao?: boolean
  via?: { kind?: string | null; unitIndex?: number; unitTotal?: number } | null
  itens?: Array<{
    nomeProduto?: string | null
    quantidade?: number | null
    observacao?: string | null
    complementos?: Array<{
      nome?: string | null
      descricao?: string | null
      quantidade?: number | null
      tipoImpactoPreco?: string | null
      impressao?: {
        quantidade?: number | null
        valorFinal?: number | null
        valorTotal?: number | null
        valorUnitario?: number | null
      } | null
    } | null> | null
  }> | null
}

export function identificacaoClienteProducao(valor?: string | null): string {
  return textoEscPosProducao(valor ?? '').toUpperCase()
}

export function montarModeloProducao80mm(origem: OrigemModeloProducao80mm): ModeloProducao80mm {
  const codigo = textoEscPosProducao(String(origem.codigoVenda ?? '')).toUpperCase()
  const viaKind = String(origem.via?.kind ?? '').trim().toLowerCase()
  const viaUnitaria = viaKind === 'unit'
  const identificacao = textoEscPosProducao(origem.identificacao ?? '').toUpperCase()

  const itens: ItemModeloProducao80mm[] = []
  for (const item of origem.itens ?? []) {
    if (!item) continue
    itens.push(montarLinhasItemPedido(item, { permitirQuantidadeZero: true }))
  }

  const qtdResumo = (origem.itens ?? []).reduce(
    (acc, item) => acc + quantidadeInteiraProducao(item?.quantidade),
    0
  )
  const meta = linhaHoraAtendente(
    horaPedidoProducao(String(origem.dataPedido ?? '')),
    String(origem.atendente ?? '')
  )
  const resumoEsq = linhaResumoProducao(qtdResumo, origem.nomeImpressora)
  const resumo = resumoEsq && meta ? `${resumoEsq} | ${meta}` : resumoEsq || meta

  const senhaTexto = origem.senha == null ? '' : textoPilulaSenha(String(origem.senha))
  const unidade =
    viaUnitaria && codigo
      ? textoPilulaUnidade(codigo, origem.via?.unitIndex ?? 1, origem.via?.unitTotal ?? 1)
      : null

  return {
    reimpressao: Boolean(origem.reimpressao),
    senha: senhaTexto || null,
    conferencia: viaKind === 'conference',
    unidade,
    identidade: textosIdentidadeProducao({
      tipoVenda: origem.tipoVenda,
      codigoVenda: codigo,
      numeroMesa: origem.numeroMesa,
      identificacao: identificacao || null,
      viaUnitaria,
    }),
    itens,
    observacaoPedido: textoEscPosProducao(origem.observacaoPedido ?? '') || null,
    resumo,
    rodape: partesRodapeProducao({
      codigoVenda: codigo,
      versao: origem.versao,
      codigoTerminal: origem.codigoTerminal,
    }),
  }
}
