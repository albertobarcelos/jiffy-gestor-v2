import type { DeliveryCupomTemplateConfig } from '@/src/shared/types/deliveryCupomTemplate'
import type {
  VendaGestorTicket,
  VendaGestorTicketItem,
  VendaGestorTicketItemComplemento,
  VendaGestorTicketsEndereco,
  VendaGestorTicketsResponse,
} from '@/src/shared/types/vendaGestorTickets'
import type {
  PrintAlign,
  PrintContentBlock,
  PrintDocument,
  PrintSize,
} from '@/src/infrastructure/printing/agent/printJobTypes'
import {
  columnsFromCupomTemplate,
  cupomPrintFontes,
  cupomPrintNegrito,
  mergeCupomTemplate,
  qrModuleSizeForWidth,
  sectionFeedLines,
  telefoneWhatsappE164,
} from '@/src/application/delivery/cupomPrintLayout'

export interface MapTicketToPrintDocumentOptions {
  nomeEmpresa?: string
  template?: DeliveryCupomTemplateConfig
}

function numeroFinito(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '') {
    const parsed = Number(v.replace(',', '.'))
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function fmtBrl(n: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

function formatTelefone(v: string): string {
  const digits = v.replace(/\D/g, '')
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  if (digits.length === 9) return `${digits.slice(0, 5)}-${digits.slice(5)}`
  if (digits.length === 8) return `${digits.slice(0, 4)}-${digits.slice(4)}`
  return v.trim()
}

function fmtDateTime(v: unknown): string {
  if (typeof v !== 'string' || !v.trim()) return ''
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v.trim()
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function quantidadeItem(it: VendaGestorTicketItem): number {
  const q = it.quantidade
  if (typeof q === 'number' && Number.isFinite(q) && q > 0) return Math.floor(q)
  return 1
}

function valorItem(item: VendaGestorTicketItem): number | null {
  return numeroFinito(item.valorFinal ?? item.valorTotal)
}

function valorComplemento(comp: VendaGestorTicketItemComplemento): number | null {
  return numeroFinito(comp?.impressao?.valorFinal ?? comp?.impressao?.valorTotal ?? comp?.impressao?.valorUnitario)
}

function labelComplemento(comp: VendaGestorTicketItemComplemento): string {
  const label =
    (comp && typeof comp === 'object' && (comp.nome || comp.descricao)
      ? String(comp.nome ?? comp.descricao)
      : '') || ''
  if (!label.trim()) return ''
  const q = numeroFinito(comp.impressao?.quantidade ?? comp.quantidade) ?? 1
  return `${q > 1 ? `${q} X ` : ''}${label.trim()}`
}

function normalizarTipoVenda(root: VendaGestorTicketsResponse): string {
  const raw = String(root.tipoVenda || '').trim().toLowerCase()
  if (!raw) return 'Entrega'
  if (raw.includes('balc')) return 'Balcão'
  if (raw.includes('retir') || raw.includes('pickup') || raw.includes('take')) return 'Retirada'
  if (raw.includes('entrega') || raw.includes('delivery')) return 'Entrega'
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

function codigoPedido(root: VendaGestorTicketsResponse): string {
  const codigo = root.codigoVenda || root.rastreamento?.codigoVenda || ''
  return codigo ? `#${codigo}` : ''
}

function nomeEmpresa(root: VendaGestorTicketsResponse, fallback: string): string {
  return (
    root.empresa?.nomeExibicao?.trim() ||
    root.empresa?.nome?.trim() ||
    root.empresa?.razaoSocial?.trim() ||
    fallback
  )
}

function nomeEntregador(root: VendaGestorTicketsResponse): string {
  const e = root.entregador
  if (!e) return ''
  return typeof e === 'string' ? e.trim() : e.nome?.trim() || ''
}

function enderecoObj(ent: VendaGestorTicketsResponse['enderecoEntrega']): VendaGestorTicketsEndereco {
  if (!ent || typeof ent === 'string') return {}
  return ent as VendaGestorTicketsEndereco
}

function formatEnderecoPrincipal(ent: VendaGestorTicketsResponse['enderecoEntrega']): string {
  if (ent == null) return ''
  if (typeof ent === 'string') return ent.trim()
  const o = ent as Record<string, unknown>
  const logradouroOuRua = o.rua || o.logradouro
  return [logradouroOuRua, o.numero, o.cep]
    .filter(x => x != null && String(x).trim() !== '')
    .map(x => String(x).trim())
    .join(', ')
}

function pushText(
  content: PrintContentBlock[],
  text: string,
  options?: { align?: PrintAlign; bold?: boolean; size?: PrintSize }
): void {
  const trimmed = text.trim()
  if (!trimmed) return
  content.push({
    type: 'text',
    text: trimmed,
    align: options?.align,
    bold: options?.bold,
    size: options?.size,
  })
}

function pushFeed(content: PrintContentBlock[], lines: number): void {
  if (lines > 0) content.push({ type: 'feed', lines })
}

function mapItens(
  ticket: VendaGestorTicket,
  mostrarValores: boolean,
  destacar: boolean,
  size: PrintSize,
  bold: boolean
): PrintContentBlock[] {
  const blocks: PrintContentBlock[] = []
  for (const item of ticket.itens ?? []) {
    const q = quantidadeItem(item)
    const nome = (item.nomeProduto ?? 'Item').trim() || 'Item'
    const titulo = `${q} X ${nome}`
    const valor = mostrarValores ? valorItem(item) : null
    if (valor != null) {
      blocks.push({ type: 'row', left: titulo, right: fmtBrl(valor), bold: bold && destacar, size })
    } else {
      blocks.push({ type: 'item', quantity: q, name: nome, bold: bold && destacar, size })
    }
    const comps = Array.isArray(item.complementos) ? item.complementos : []
    for (const comp of comps) {
      const label = labelComplemento(comp)
      if (!label) continue
      const valorComp = mostrarValores ? valorComplemento(comp) : null
      if (valorComp != null) {
        blocks.push({ type: 'row', left: `  ${label}`, right: fmtBrl(valorComp), size: 'small' })
      } else {
        pushText(blocks, `  ${label}`, { size: 'small' })
      }
    }
    if (typeof item.observacao === 'string' && item.observacao.trim()) {
      pushText(blocks, `  ${item.observacao.trim()}`, { size: 'small' })
    }
  }
  return blocks
}

function mapEndereco(
  root: VendaGestorTicketsResponse,
  template: DeliveryCupomTemplateConfig,
  size: PrintSize,
  bold: boolean
): PrintContentBlock[] {
  if (!template.mostrarEnderecoEntrega) return []
  const ent = enderecoObj(root.enderecoEntrega)
  const enderecoCompleto = formatEnderecoPrincipal(root.enderecoEntrega)
  const complemento = ent.complemento ? String(ent.complemento).trim() : ''
  const bairro = ent.bairro ? String(ent.bairro).trim() : ''
  const cidade = ent.cidade || ent.municipio ? String(ent.cidade ?? ent.municipio).trim() : ''
  const referencia = ent.referencia || ent.pontoReferencia ? String(ent.referencia ?? ent.pontoReferencia).trim() : ''
  if (!enderecoCompleto && !complemento && !bairro && !cidade && !referencia) return []

  const blocks: PrintContentBlock[] = []
  if (enderecoCompleto) pushText(blocks, `ENDERECO: ${enderecoCompleto}`, { size, bold })
  if (complemento) pushText(blocks, `COMPLEMENTO: ${complemento}`, { size, bold })
  if (bairro) pushText(blocks, `BAIRRO: ${bairro}`, { size, bold })
  if (cidade) pushText(blocks, `CIDADE: ${cidade}`, { size, bold })
  if (referencia) pushText(blocks, `REFERENCIA: ${referencia}`, { size, bold })
  return blocks
}

function mapWhatsappQr(telefone: string, larguraMm: number): PrintContentBlock[] {
  const e164 = telefoneWhatsappE164(telefone)
  if (!e164) return []
  return [
    { type: 'qrcode', data: `https://wa.me/${e164}`, moduleSize: qrModuleSizeForWidth(larguraMm) },
    { type: 'text', text: 'Scaneie e fale com o cliente via WhatsApp', size: 'small' },
  ]
}

function mapPagamento(root: VendaGestorTicketsResponse, size: PrintSize, bold: boolean): PrintContentBlock[] {
  const p = root.pagamento
  const total = numeroFinito(root.resumoPedido?.valorTotal) ?? numeroFinito(root.valorFinal) ?? 0
  const status = String(p?.status || '').toLowerCase()
  const faltante = numeroFinito(p?.valorFaltante) ?? (status === 'pago' ? 0 : total)
  const recebido = numeroFinito(p?.valorRecebido) ?? 0
  const receber = numeroFinito(p?.valorCobrarNaEntrega) ?? 0
  const meio = p?.meioPagamento || p?.formaPagamento || p?.meios?.[0]?.nome || p?.meios?.[0]?.tipo || ''
  const trocoCalculado = numeroFinito(p?.trocoParaLevar) ?? 0
  const deveCobrar = p?.cobrarCliente === true || status === 'pendente' || (!status && receber > 0)
  const blocks: PrintContentBlock[] = [{ type: 'divider', style: 'double' }]

  if (deveCobrar) {
    pushText(blocks, 'COBRAR DO CLIENTE', { align: 'center', bold, size })
    blocks.push({ type: 'row', left: 'Cobrar na entrega', right: fmtBrl(receber), size })
    if (meio.trim()) pushText(blocks, `Pag.: ${meio.trim()}`, { align: 'center', size })
    if (trocoCalculado > 0) blocks.push({ type: 'row', left: 'Levar troco', right: fmtBrl(trocoCalculado), size })
    return blocks
  }

  pushText(blocks, 'PEDIDO PAGO', { align: 'center', bold, size })
  if (p?.meios?.length) {
    for (const m of p.meios) {
      const nome = m.nome || m.tipo || 'PAGO'
      const valor = numeroFinito(m.valor) ?? recebido ?? total
      blocks.push({ type: 'row', left: nome.toUpperCase(), right: fmtBrl(valor), size })
    }
  } else {
    blocks.push({
      type: 'row',
      left: (meio || 'PAGO').toUpperCase(),
      right: fmtBrl(recebido || total - faltante),
      size,
    })
  }
  if (faltante > 0) blocks.push({ type: 'row', left: 'FALTA', right: fmtBrl(Math.max(0, faltante)), bold, size })
  if (trocoCalculado > 0) blocks.push({ type: 'row', left: 'Levar troco', right: fmtBrl(trocoCalculado), size })
  return blocks
}

function mapResumo(
  root: VendaGestorTicketsResponse,
  ticket: VendaGestorTicket,
  size: PrintSize,
  bold: boolean
): PrintContentBlock[] {
  const itensCalculado = ticket.itens.reduce((acc, item) => acc + (valorItem(item) ?? 0), 0)
  const adicionaisCalculado = ticket.itens.reduce((acc, item) => {
    const comps = Array.isArray(item.complementos) ? item.complementos : []
    return acc + comps.reduce((total, comp) => total + (valorComplemento(comp) ?? 0), 0)
  }, 0)
  const resumo = {
    valorItens: numeroFinito(root.resumoPedido?.valorItens) ?? itensCalculado,
    valorAdicionais: numeroFinito(root.resumoPedido?.valorAdicionais) ?? adicionaisCalculado,
    taxaEntrega: numeroFinito(root.resumoPedido?.taxaEntrega) ?? 0,
    valorTotal: numeroFinito(root.resumoPedido?.valorTotal) ?? numeroFinito(root.valorFinal) ?? 0,
  }
  return [
    { type: 'divider' },
    { type: 'text', text: 'RESUMO PEDIDO', bold, size },
    { type: 'row', left: 'Valor total dos itens', right: fmtBrl(resumo.valorItens), bold, size },
    { type: 'row', left: 'Adicionais', right: fmtBrl(resumo.valorAdicionais), bold, size },
    { type: 'row', left: 'Taxa de Entrega', right: fmtBrl(resumo.taxaEntrega), bold, size },
    { type: 'row', left: 'Total do Pedido', right: fmtBrl(resumo.valorTotal), bold, size },
  ]
}

/**
 * Converte o ticket delivery no Document do agente (sem ESC/POS).
 * Espelha o preview HTML o máximo que a térmica permite.
 */
export function mapTicketToPrintDocument(
  root: VendaGestorTicketsResponse,
  ticket: VendaGestorTicket,
  options?: MapTicketToPrintDocumentOptions
): PrintDocument {
  const template = mergeCupomTemplate(options?.template)
  const fontes = cupomPrintFontes(template, ticket.tipoCupom)
  const negrito = cupomPrintNegrito(template, ticket.tipoCupom)
  const gap = sectionFeedLines(template.densidade)
  const empresa = nomeEmpresa(root, options?.nomeEmpresa?.trim() || 'Jiffy Gestor')
  const tipoVenda = normalizarTipoVenda(root)
  const codigo = codigoPedido(root)
  const numero = root.numeroVenda != null ? `Pedido #${root.numeroVenda}` : 'Pedido'
  const titulo = `${numero} ${tipoVenda}${codigo ? ` ${codigo}` : ''}`.trim()
  const producao = ticket.tipoCupom === 'producao'
  const content: PrintContentBlock[] = []

  if (template.mostrarLogoTexto) {
    pushText(content, empresa, { align: 'center', bold: negrito.cabecalho, size: fontes.cabecalho })
  }
  pushText(content, titulo, { align: 'center', bold: negrito.cabecalho, size: 'double' })
  if (template.cabecalhoExtra.trim()) {
    pushText(content, template.cabecalhoExtra.trim(), { align: 'center', bold: negrito.cabecalho, size: fontes.cabecalho })
  }
  content.push({ type: 'divider' })
  pushFeed(content, gap)

  const dataPedido = fmtDateTime(root.dataPedido || root.rastreamento?.geradoEm)
  const dataPrevista = fmtDateTime(root.dataPrevista)
  if (dataPedido) pushText(content, `Data: ${dataPedido}`, { size: fontes.pedido, bold: negrito.pedido })
  if (dataPrevista) pushText(content, `Data Prevista: ${dataPrevista}`, { size: fontes.pedido, bold: negrito.pedido })
  if (producao) {
    const entregador = nomeEntregador(root)
    if (entregador) {
      content.push({ type: 'divider' })
      pushText(content, `Entregador: ${entregador}`, { size: fontes.pedido, bold: negrito.pedido })
    }
  }

  const cliente = root.cliente?.nome?.trim() || '—'
  const tel =
    (typeof root.cliente?.telefone === 'string' && root.cliente.telefone.trim()) ||
    (typeof root.cliente?.celular === 'string' && root.cliente.celular.trim()) ||
    ''
  pushText(content, producao ? `Cliente: ${cliente}` : `CLIENTE: ${cliente}`, {
    bold: negrito.cliente,
    size: fontes.cliente,
  })
  if (!producao && template.mostrarTelefoneCliente && tel) {
    pushText(content, `TELEFONE: ${formatTelefone(tel)}`, { size: fontes.cliente, bold: negrito.cliente })
  }

  if (!producao) {
    content.push(...mapEndereco(root, template, fontes.cliente, negrito.cliente))
    if (template.mostrarTelefoneCliente) {
      content.push(...mapWhatsappQr(tel, template.larguraMm))
    }
  }

  content.push({ type: 'divider' })
  pushFeed(content, gap)
  const totalItens = (ticket.itens ?? []).reduce((acc, item) => acc + quantidadeItem(item), 0)
  pushText(content, `ITENS DO PEDIDO (${totalItens})`, { bold: negrito.itens, size: fontes.itens })
  content.push(
    ...mapItens(
      ticket,
      producao ? false : template.mostrarValores,
      template.destacarProdutos,
      fontes.itens,
      negrito.itens
    )
  )

  if (template.mostrarObservacaoPedido && root.observacaoPedido?.trim()) {
    content.push({ type: 'divider' })
    pushText(content, 'OBSERVACAO DO PEDIDO', { align: 'center', bold: true, size: fontes.pedido })
    pushText(content, root.observacaoPedido.trim(), { align: 'center', bold: true, size: fontes.itens })
    content.push({ type: 'divider' })
  }

  if (!producao && template.mostrarValores) {
    content.push(...mapResumo(root, ticket, fontes.resumo, negrito.resumo))
    content.push(...mapPagamento(root, fontes.pagamento, negrito.pagamento))
  }

  if (template.rodapeExtra.trim()) {
    content.push({ type: 'divider' })
    pushText(content, template.rodapeExtra.trim(), { align: 'center', bold: negrito.rodape, size: fontes.rodape })
  }
  pushText(content, 'Feito com carinho por Jiffy POS', { align: 'center', bold: negrito.rodape, size: fontes.rodape })
  if (template.mostrarDataHora) {
    pushText(content, new Date().toLocaleString('pt-BR'), { align: 'center', size: 'small' })
  }
  content.push({ type: 'feed', lines: producao || template.densidade === 'compacto' ? 3 : 4 })
  content.push({ type: 'cut' })

  return {
    type: 'ORDER',
    columns: columnsFromCupomTemplate(template),
    content,
  }
}
