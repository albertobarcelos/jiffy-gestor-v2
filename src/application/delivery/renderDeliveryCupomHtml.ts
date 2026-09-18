import type {
  VendaGestorTicket,
  VendaGestorTicketItem,
  VendaGestorTicketItemComplemento,
  VendaGestorTicketsEndereco,
  VendaGestorTicketsResponse,
} from '@/src/shared/types/vendaGestorTickets'
import {
  DEFAULT_DELIVERY_CUPOM_TEMPLATE,
  DEFAULT_FONTES_MODELO,
  type DeliveryCupomModeloFonteConfig,
  type DeliveryCupomTemplateConfig,
} from '@/src/shared/types/deliveryCupomTemplate'
import { renderDashSeparatorHtml, renderQrSvg } from '@/src/infrastructure/printing/receiptBitmaps'
import {
  avisoCobrancaEntregadorCupom,
  deveCobrarNaEntregaCupom,
  linhasResumoPagamentoCupom,
} from '@/src/application/delivery/textoPagamentoCupomDelivery'
import { fonteProdutoEscPosA22Px } from '@/src/application/delivery/cupomPrintLayout'
import {
  detalheLinhasItemPedido,
  identidadePrimariaEhTipoAvulso,
  montarModeloProducao80mm,
} from '@/src/application/delivery/layoutProducao80mm'
import { origemModeloProducaoDeTicket } from '@/src/application/delivery/origemModeloProducao'
import { ESCPOS_FONT_A_FACE_CSS } from '@/src/infrastructure/printing/escposFontAFace'

export interface RenderDeliveryCupomHtmlInput {
  root: VendaGestorTicketsResponse
  ticket: VendaGestorTicket
  nomeEmpresa?: string
  template?: DeliveryCupomTemplateConfig
}

let cupomInnerWidthPx = 280

function htmlSeparator(double = false): string {
  return renderDashSeparatorHtml(cupomInnerWidthPx, double)
}

function renderObsPedido(root: VendaGestorTicketsResponse, template: DeliveryCupomTemplateConfig): string {
  const texto = template.mostrarObservacaoPedido ? root.observacaoPedido?.trim() : ''
  if (!texto) return ''
  return `${htmlSeparator()}
  <div class="obs-box">
    <div class="obs-title">OBSERVAÇÃO DO PEDIDO</div>
    <div class="obs-text">${escapeHtml(texto)}</div>
  </div>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeMultiline(s: string): string {
  return escapeHtml(s).replace(/\r?\n/g, '<br/>')
}

function fmtBrl(n: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

function numeroFinito(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '') {
    const parsed = Number(v.replace(',', '.'))
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
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

function formatTelefone(v: string): string {
  const digits = v.replace(/\D/g, '')
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  if (digits.length === 9) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`
  }
  if (digits.length === 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`
  }
  return v.trim()
}

function telefoneWhatsapp(v: string): string {
  const digits = v.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('55')) return digits
  if (digits.length === 10 || digits.length === 11) return `55${digits}`
  return digits
}

function quantidadeItem(it: VendaGestorTicketItem): number {
  const q = it.quantidade
  if (typeof q === 'number' && Number.isFinite(q) && q > 0) return q
  return 1
}

function totalItensPedido(ticket: VendaGestorTicket): number {
  return (ticket.itens ?? []).reduce((total, item) => total + quantidadeItem(item), 0)
}

function formatEndereco(ent: VendaGestorTicketsResponse['enderecoEntrega']): string {
  if (ent == null) return ''
  if (typeof ent === 'string') return ent.trim()
  const o = ent as Record<string, unknown>
  const parts = [
    o.logradouro,
    o.rua,
    o.numero,
    o.complemento,
    o.bairro,
    o.cidade,
    o.municipio,
    o.estado,
    o.uf,
    o.cep,
  ]
    .filter(x => x != null && String(x).trim() !== '')
    .map(x => String(x).trim())
  return parts.join(', ')
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

export function larguraCupomDeliveryPx(larguraMm: number): number {
  return larguraMm === 58 ? 220 : 300
}

function larguraPx(mm: number): number {
  return larguraCupomDeliveryPx(mm)
}

function paddingPorDensidade(densidade: DeliveryCupomTemplateConfig['densidade']): number {
  if (densidade === 'compacto') return 0
  if (densidade === 'espacoso') return 12
  return 2
}

function lineHeightPorDensidade(densidade: DeliveryCupomTemplateConfig['densidade']): number {
  if (densidade === 'compacto') return 1
  if (densidade === 'espacoso') return 1.5
  return 1.1
}

function separatorPyPorDensidade(densidade: DeliveryCupomTemplateConfig['densidade']): number {
  if (densidade === 'compacto') return 3
  if (densidade === 'espacoso') return 16
  return 5
}

function itemRowPyPorDensidade(densidade: DeliveryCupomTemplateConfig['densidade']): number {
  if (densidade === 'compacto') return 0
  if (densidade === 'espacoso') return 4
  return 2
}

function fonteBloco(v: number | null | undefined, fallback: number): number {
  return Math.min(18, Math.max(8, Math.floor(v ?? fallback)))
}

function fontesDoModelo(
  template: DeliveryCupomTemplateConfig,
  tipoCupom: VendaGestorTicket['tipoCupom']
): DeliveryCupomModeloFonteConfig {
  const modelo = tipoCupom === 'producao' ? 'producao' : 'expedicao'
  return {
    ...DEFAULT_FONTES_MODELO,
    ...template.fontesPorModelo?.[modelo],
  }
}

function valorItem(item: VendaGestorTicketItem): number | null {
  return numeroFinito(item.valorFinal ?? item.valorTotal)
}

function valorComplemento(comp: VendaGestorTicketItemComplemento): number | null {
  return numeroFinito(comp?.impressao?.valorFinal ?? comp?.impressao?.valorTotal ?? comp?.impressao?.valorUnitario)
}

function marcarSinalComplementoHtml(texto: string): string {
  const escaped = escapeHtml(texto)
  return escaped.replace(/^(\s*)([+\-*])(\s)/, '$1<span class="item-comp-sign">$2</span>$3')
}

function renderLinhaValor(labelHtml: string, valorHtml: string | null, options?: { strong?: boolean }): string {
  if (!valorHtml) {
    return `<div class="row-line"><span class="label">${labelHtml}</span></div>`
  }
  const tag = options?.strong ? 'strong' : 'span'
  return `<div class="row-line"><${tag} class="label">${labelHtml}</${tag}><${tag} class="value">${valorHtml}</${tag}></div>`
}

function renderItens(
  ticket: VendaGestorTicket,
  _template: DeliveryCupomTemplateConfig,
  options: { mostrarValores: boolean }
): string {
  return (ticket.itens ?? [])
    .map(item => {
      const detalhe = detalheLinhasItemPedido(item, { permitirQuantidadeZero: !options.mostrarValores })
      const valor = options.mostrarValores ? valorItem(item) : null
      const precoItem = options.mostrarValores && valor != null ? escapeHtml(fmtBrl(valor)) : null
      const extras = detalhe.complementos
        .map(extra => {
          const valorComp = options.mostrarValores ? valorComplemento(extra.origem) : null
          const precoComp =
            options.mostrarValores && valorComp != null ? escapeHtml(fmtBrl(valorComp)) : null
          return `<div class="item-comps">${renderLinhaValor(marcarSinalComplementoHtml(extra.texto), precoComp, { strong: true })}</div>`
        })
        .join('')
      const obs = detalhe.observacao
        ? `<div class="item-note">${escapeHtml(detalhe.observacao)}</div>`
        : ''
      return `<div class="item-row">
        <div class="item-title">${renderLinhaValor(escapeHtml(detalhe.produto), precoItem)}</div>
        ${extras}
        ${obs}
      </div>`
    })
    .join('')
}

function resumoPedido(root: VendaGestorTicketsResponse, ticket: VendaGestorTicket) {
  const itensCalculado = ticket.itens.reduce((acc, item) => acc + (valorItem(item) ?? 0), 0)
  const adicionaisCalculado = ticket.itens.reduce((acc, item) => {
    const comps = Array.isArray(item.complementos) ? item.complementos : []
    return acc + comps.reduce((total, comp) => total + (valorComplemento(comp) ?? 0), 0)
  }, 0)

  return {
    valorItens: numeroFinito(root.resumoPedido?.valorItens) ?? itensCalculado,
    valorAdicionais: numeroFinito(root.resumoPedido?.valorAdicionais) ?? adicionaisCalculado,
    taxaEntrega: numeroFinito(root.resumoPedido?.taxaEntrega) ?? 0,
    valorTotal: numeroFinito(root.resumoPedido?.valorTotal) ?? numeroFinito(root.valorFinal) ?? 0,
  }
}

function rotuloNumeroPedido(root: VendaGestorTicketsResponse): string {
  const numero = root.numeroVenda
  if (numero === undefined || numero === null || String(numero).trim() === '') return ''
  return `Pedido <strong>#${escapeHtml(String(numero))}</strong>`
}

function renderCabecalho(
  root: VendaGestorTicketsResponse,
  template: DeliveryCupomTemplateConfig,
  empresa: string,
  cabecalhoExtra: string
): string {
  const tipoVenda = normalizarTipoVenda(root)
  const codigo = codigoPedido(root)
  const pedido = rotuloNumeroPedido(root)

  return `<div class="header">
    ${template.mostrarLogoTexto ? `<div class="brand">${escapeHtml(empresa)}</div>` : ''}
    <div class="method">${pedido ? `${pedido} ` : ''}${escapeHtml(tipoVenda)}</div>
    ${codigo ? `<div class="codigo-destaque">${escapeHtml(codigo)}</div>` : ''}
    ${cabecalhoExtra}
  </div>
  ${htmlSeparator()}`
}

function renderMetaPedido(
  root: VendaGestorTicketsResponse,
  opcoes: { incluirDatas: boolean; incluirEntregador: boolean }
): string {
  const dataPedido = opcoes.incluirDatas
    ? fmtDateTime(root.dataPedido || root.rastreamento?.geradoEm)
    : ''
  const dataPrevista = opcoes.incluirDatas ? fmtDateTime(root.dataPrevista) : ''
  const entregador = opcoes.incluirEntregador ? nomeEntregador(root) : ''
  const linhas: string[] = []
  if (dataPedido) linhas.push(`<div><strong>Data:</strong> ${escapeHtml(dataPedido)}</div>`)
  if (dataPrevista) {
    linhas.push(`<div><strong>Data Prevista:</strong> ${escapeHtml(dataPrevista)}</div>`)
  }
  if (entregador) {
    if (linhas.length > 0) linhas.push(htmlSeparator())
    linhas.push(`<div><strong>Entregador:</strong> ${escapeHtml(entregador)}</div>`)
  }
  if (linhas.length === 0) return ''
  return `<div class="section meta-section">${linhas.join('')}</div>`
}

function renderRodape(template: DeliveryCupomTemplateConfig, rodapeExtra: string): string {
  return `<div class="footer">
    ${rodapeExtra}
    <div>Feito com carinho ♥ por Jiffy POS</div>
    ${template.mostrarDataHora ? `<div class="printed-at">${escapeHtml(new Date().toLocaleString('pt-BR'))}</div>` : ''}
  </div>`
}

function htmlPilulaProducao(texto: string, classe: string): string {
  return `<div class="prod-pill ${classe}">${escapeHtml(texto)}</div>`
}

function renderProducao(
  input: RenderDeliveryCupomHtmlInput,
  _template: DeliveryCupomTemplateConfig,
  _cabecalhoExtra: string,
  _rodapeExtra: string
): string {
  const modelo = montarModeloProducao80mm(origemModeloProducaoDeTicket(input.root, input.ticket))
  const itens = modelo.itens
    .map(item => {
      const extras = item.extras
        .map(linha => `<div class="prod-extra">${escapeHtml(linha)}</div>`)
        .join('')
      return `<div class="prod-item-block">
        <div class="prod-item">${escapeHtml(item.produto)}</div>
        ${extras}
      </div>
      ${htmlSeparator()}`
    })
    .join('')

  return `<div class="prod-80">
    ${modelo.reimpressao ? '<div class="prod-banner">** REIMPRESSAO **</div>' : ''}
    ${modelo.senha ? htmlPilulaProducao(modelo.senha, 'prod-pill-senha') : ''}
    ${modelo.conferencia ? '<div class="prod-banner">*** VIA DE CONFERENCIA ***</div>' : ''}
    ${modelo.unidade ? htmlPilulaProducao(modelo.unidade, 'prod-pill-codigo') : ''}
    ${
      modelo.identidade.primaria
        ? htmlPilulaProducao(
            modelo.identidade.primaria,
            identidadePrimariaEhTipoAvulso(modelo.identidade.primaria)
              ? 'prod-pill-id'
              : 'prod-pill-codigo'
          )
        : ''
    }
    ${modelo.identidade.secundaria ? htmlPilulaProducao(modelo.identidade.secundaria, 'prod-pill-id') : ''}
    ${htmlSeparator()}
    ${itens}
    ${
      modelo.observacaoPedido
        ? `<div class="prod-obs">
      <div class="prod-obs-title">OBSERVACAO DO PEDIDO</div>
      <div class="prod-obs-text">${escapeHtml(modelo.observacaoPedido)}</div>
    </div>
    ${htmlSeparator()}`
        : ''
    }
    <div class="prod-resumo">${escapeHtml(modelo.resumo)}</div>
    ${modelo.rodape.map(linha => `<div class="prod-rodape">${escapeHtml(linha)}</div>`).join('')}
  </div>`
}

function renderEnderecoExpedicao(root: VendaGestorTicketsResponse, template: DeliveryCupomTemplateConfig): string {
  if (!template.mostrarEnderecoEntrega) return ''
  const ent = enderecoObj(root.enderecoEntrega)
  const enderecoCompleto = formatEnderecoPrincipal(root.enderecoEntrega)
  const complemento = ent.complemento ? String(ent.complemento).trim() : ''
  const bairro = ent.bairro ? String(ent.bairro).trim() : ''
  const cidade = ent.cidade || ent.municipio ? String(ent.cidade ?? ent.municipio).trim() : ''
  const referencia = ent.referencia || ent.pontoReferencia ? String(ent.referencia ?? ent.pontoReferencia).trim() : ''

  if (!enderecoCompleto && !complemento && !bairro && !cidade && !referencia) return ''

  return `<div class="section address-section" style="white-space: normal; word-wrap: break-word; overflow-wrap: break-word; word-break: normal;">
    ${enderecoCompleto ? `<div style="margin-bottom: 1px;"><strong>ENDEREÇO:</strong> ${escapeHtml(enderecoCompleto)}</div>` : ''}
    ${complemento ? `<div style="margin-bottom: 1px;"><strong>COMPLEMENTO:</strong> ${escapeHtml(complemento)}</div>` : ''}
    ${bairro ? `<div style="margin-bottom: 1px;"><strong>BAIRRO:</strong> ${escapeHtml(bairro)}</div>` : ''}
    ${cidade ? `<div style="margin-bottom: 1px;"><strong>CIDADE:</strong> ${escapeHtml(cidade)}</div>` : ''}
    ${referencia ? `<div style="margin-bottom: 1px;"><strong>REFERENCIA:</strong> ${escapeHtml(referencia)}</div>` : ''}
  </div>`
}

function renderWhatsappQr(telefone: string): string {
  const whatsappTelefone = telefoneWhatsapp(telefone)
  if (!whatsappTelefone) return ''
  const url = `https://wa.me/${whatsappTelefone}`

  return `<div class="whatsapp-qr">
    ${renderQrSvg(url, 96)}
    <div>Scaneie e fale com o cliente via WhatsApp</div>
  </div>`
}

function renderResumoExpedicao(root: VendaGestorTicketsResponse, ticket: VendaGestorTicket): string {
  const resumo = resumoPedido(root, ticket)
  const linhasPago = linhasResumoPagamentoCupom(root.pagamento, fmtBrl)
    .map(linha =>
      renderLinhaValor(`${escapeHtml(linha.left)}:`, escapeHtml(linha.right))
    )
    .join('')

  return `${htmlSeparator()}
  <div class="summary-section">
    <div class="items-title">RESUMO PEDIDO</div>
    ${renderLinhaValor('Valor total dos itens:', escapeHtml(fmtBrl(resumo.valorItens)))}
    ${renderLinhaValor('Adicionais:', escapeHtml(fmtBrl(resumo.valorAdicionais)))}
    ${renderLinhaValor('Taxa de Entrega:', escapeHtml(fmtBrl(resumo.taxaEntrega)))}
    ${renderLinhaValor('Total do Pedido:', escapeHtml(fmtBrl(resumo.valorTotal)), { strong: true })}
    ${linhasPago}
  </div>`
}

function renderPagamento(root: VendaGestorTicketsResponse): string {
  const p = root.pagamento
  const trocoCalculado = numeroFinito(p?.trocoParaLevar) ?? 0
  const trocoHtml =
    trocoCalculado > 0
      ? `<div class="charge-troco">Levar troco: ${fmtBrl(trocoCalculado)}</div>`
      : ''
  const aviso = avisoCobrancaEntregadorCupom(p, fmtBrl)

  if (aviso) {
    const linhas = aviso.linhas
      .map(
        linha =>
          `<div class="charge-linha"><strong>${escapeHtml(linha.left)}:</strong> ${escapeHtml(linha.right)}</div>`
      )
      .join('')
    return `${htmlSeparator(true)}
    <div class="payment-section charge-box">
      ${linhas}
      ${trocoHtml}
    </div>`
  }

  if (deveCobrarNaEntregaCupom(p)) {
    return `${htmlSeparator(true)}
    <div class="payment-section charge-box">
      <div class="charge-linha"><strong>COBRAR NA ENTREGA</strong></div>
      ${trocoHtml}
    </div>`
  }

  return `${htmlSeparator(true)}
  <div class="payment-section">
    <div class="paid">PEDIDO PAGO</div>
    ${trocoHtml}
  </div>
  ${htmlSeparator()}`
}

function renderTituloItensPedido(ticket: VendaGestorTicket): string {
  return `<div class="items-title">ITENS DO PEDIDO (${totalItensPedido(ticket)})</div>`
}

function renderExpedicao(
  input: RenderDeliveryCupomHtmlInput,
  template: DeliveryCupomTemplateConfig,
  cabecalhoExtra: string,
  rodapeExtra: string
): string {
  const root = input.root
  const ticket = input.ticket
  const empresa = nomeEmpresa(root, input.nomeEmpresa?.trim() || 'Jiffy Gestor')
  const cr = root.cliente
  const cliente = cr?.nome?.trim() || '—'
  const tel =
    (typeof cr?.telefone === 'string' && cr.telefone.trim()) ||
    (typeof cr?.celular === 'string' && cr.celular.trim()) ||
    ''
  const telefoneFormatado = tel ? formatTelefone(tel) : ''
  return `${renderCabecalho(root, template, empresa, cabecalhoExtra)}
  ${renderMetaPedido(root, { incluirDatas: true, incluirEntregador: false })}
  ${htmlSeparator()}
  <div class="section customer-section" style="white-space: normal; word-wrap: break-word; overflow-wrap: break-word; word-break: normal;">
    <div style="margin-bottom: 1px;"><strong>CLIENTE:</strong> ${escapeHtml(cliente)}</div>
    ${template.mostrarTelefoneCliente && telefoneFormatado ? `<div style="margin-bottom: 1px;"><strong>TELEFONE:</strong> ${escapeHtml(telefoneFormatado)}</div>` : ''}
  </div>
  ${renderEnderecoExpedicao(root, template)}
  ${renderWhatsappQr(tel)}
  ${htmlSeparator()}
  ${renderTituloItensPedido(ticket)}
  ${renderItens(ticket, template, { mostrarValores: template.mostrarValores })}
  ${renderObsPedido(root, template)}
  ${template.mostrarValores ? renderResumoExpedicao(root, ticket) : ''}
  ${template.mostrarValores ? renderPagamento(root) : ''}
  ${renderRodape(template, rodapeExtra)}`
}

export function renderDeliveryCupomHtml(input: RenderDeliveryCupomHtmlInput): string {
  const template = { ...DEFAULT_DELIVERY_CUPOM_TEMPLATE, ...input.template }
  const ticket = input.ticket
  const fontesModelo = fontesDoModelo(template, ticket.tipoCupom)
  const w = larguraPx(template.larguraMm)
  const padding = paddingPorDensidade(template.densidade)
  // Margem lateral configurável (mm → px na mesma escala da largura) para afastar o conteúdo
  // da borda e evitar corte do lado direito em impressoras com área imprimível menor.
  const margemLateralPx = Math.max(
    0,
    Math.round((template.margemLateralMm ?? 0) * (w / template.larguraMm))
  )
  const paddingLateral = Math.max(padding, 2) + margemLateralPx
  cupomInnerWidthPx = Math.max(80, w - paddingLateral * 2)
  const separatorPy = separatorPyPorDensidade(template.densidade)
  const itemRowPy = itemRowPyPorDensidade(template.densidade)
  const headerGap = template.densidade === 'compacto' ? 0 : Math.max(2, Math.floor(padding / 2))
  const footerMt = template.densidade === 'compacto' ? 4 : template.densidade === 'espacoso' ? 12 : 8
  const extraMt = template.densidade === 'compacto' ? 2 : template.densidade === 'espacoso' ? 6 : 4
  const methodMt = template.densidade === 'compacto' ? 1 : 4
  const qrGapTop = template.densidade === 'espacoso' ? 10 : 8
  const qrGapBottom = template.densidade === 'compacto' ? 1 : template.densidade === 'espacoso' ? 3 : 2
  const separatorAfterQr = Math.max(1, Math.ceil(separatorPy / 2))
  const lineHeight = lineHeightPorDensidade(template.densidade)
  const fonteBase = template.tamanhoFonteBase
  const fonteCabecalho = fonteBloco(
    fontesModelo.tamanhoFonteCabecalho ?? template.tamanhoFonteCabecalho,
    fonteBase
  )
  const fontePedido = fonteBloco(
    fontesModelo.tamanhoFontePedido ?? template.tamanhoFontePedido,
    fonteBase
  )
  const fonteClienteEndereco = fonteBloco(
    fontesModelo.tamanhoFonteClienteEndereco ?? template.tamanhoFonteClienteEndereco,
    fonteBase
  )
  const fonteItens = fonteBloco(
    fontesModelo.tamanhoFonteItens ?? template.tamanhoFonteItens,
    fonteBase
  )
  const fonteProduto = fonteProdutoEscPosA22Px(template.larguraMm)
  const fonteResumo = fonteBloco(
    fontesModelo.tamanhoFonteResumo ?? template.tamanhoFonteResumo,
    fonteBase
  )
  const fontePagamento = fonteBloco(
    fontesModelo.tamanhoFontePagamento ?? template.tamanhoFontePagamento,
    fonteBase
  )
  const fonteRodape = fonteBloco(
    fontesModelo.tamanhoFonteRodape ?? template.tamanhoFonteRodape,
    Math.max(8, fonteBase - 2)
  )
  const dFontes = DEFAULT_DELIVERY_CUPOM_TEMPLATE
  const peso = (on: boolean) => (on ? '800' : '400')
  const negritoCabecalho = fontesModelo.negritoCabecalho ?? dFontes.negritoCabecalho
  const negritoPedido = fontesModelo.negritoPedido ?? dFontes.negritoPedido
  const negritoCliente = fontesModelo.negritoClienteEndereco ?? dFontes.negritoClienteEndereco
  const negritoItens = fontesModelo.negritoItens ?? dFontes.negritoItens
  const negritoResumo = fontesModelo.negritoResumo ?? dFontes.negritoResumo
  const negritoPagamento = fontesModelo.negritoPagamento ?? dFontes.negritoPagamento
  const negritoRodape = fontesModelo.negritoRodape ?? dFontes.negritoRodape

  const cabecalhoExtra = template.cabecalhoExtra.trim()
    ? `<div class="extra-header">${escapeMultiline(template.cabecalhoExtra.trim())}</div>`
    : ''
  const rodapeExtra = template.rodapeExtra.trim()
    ? `<div class="extra-footer">${escapeMultiline(template.rodapeExtra.trim())}</div>`
    : ''

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  ${ESCPOS_FONT_A_FACE_CSS}
  html, body { margin:0; overflow-x:hidden; }
  body { width:${w}px; max-width:100%; margin-left:auto; margin-right:auto; font-family: "Segoe UI", Tahoma, Arial, sans-serif; color:#000; -webkit-font-smoothing:antialiased; }
  .receipt { box-sizing:border-box; width:100%; max-width:100%; margin:0; padding:${template.densidade === 'compacto' ? 0 : 2}px ${paddingLateral}px ${padding}px ${paddingLateral}px; font-size:${template.tamanhoFonteBase}px; line-height:${lineHeight}; overflow-x:hidden; }
  .header { text-align:center; padding-bottom:${headerGap}px; margin-bottom:${headerGap}px; font-size:${fonteCabecalho}px; font-weight:${peso(negritoCabecalho)}; }
  .header strong { font-weight:inherit; }
  .brand { font-weight:inherit; font-size:${fonteCabecalho + 1}px; letter-spacing:.02em; }
  .method { display:inline-block; margin-top:${methodMt}px; padding:5px 12px 7px; font-weight:${negritoCabecalho ? 900 : 400}; font-size:${Math.max(fonteCabecalho + 8, 17)}px; border:2px solid #000; border-radius:4px; line-height:1.05; }
  .codigo-destaque { box-sizing:border-box; display:block; width:100%; margin-top:6px; padding:10px 4px 12px; background:#000; color:#fff; border:3px solid #000; border-radius:4px; font-weight:900; font-size:${Math.max(fonteCabecalho + 14, 26)}px; letter-spacing:.16em; line-height:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .section { margin:${padding}px 0; }
  .meta-section, .meta-section strong { font-size:${fontePedido}px; font-weight:${peso(negritoPedido)}; }
  .customer-section, .address-section, .customer-section strong, .address-section strong { font-size:${fonteClienteEndereco}px; font-weight:${peso(negritoCliente)}; }
  .address-section { padding-bottom:8px; overflow:visible; }
  .whatsapp-qr { margin:${qrGapTop}px 0 ${qrGapBottom}px 0; display:flex; align-items:center; justify-content:flex-start; gap:6px; font-size:10px; font-weight:${peso(negritoCliente)}; line-height:1.15; }
  .whatsapp-qr + .separator { margin-top:${separatorAfterQr}px; }
  .whatsapp-qr img, .whatsapp-qr svg { display:block; width:96px; height:96px; flex:0 0 auto; image-rendering:pixelated; image-rendering:crisp-edges; }
  .whatsapp-qr div { max-width:130px; text-align:left; }
  .separator { width:100%; margin:${separatorPy}px 0; padding:0; border:0; line-height:0; }
  .separator img { display:block; width:100%; height:auto; image-rendering:pixelated; image-rendering:crisp-edges; }
  .items-title { margin:${padding}px 0 ${template.densidade === 'compacto' ? 1 : 3}px; font-weight:${peso(negritoItens)}; font-size:${fonteItens}px; }
  .items-title-inline { font-weight:400; white-space:nowrap; width:max-content; max-width:100%; }
  .items-title-label { display:inline-block; vertical-align:middle; font-weight:400; font-size:${Math.max(8, fonteItens - 3)}px; margin-right:6px; line-height:1.2; }
  .items-qty { display:inline-block; vertical-align:middle; box-sizing:border-box; min-width:1.15em; padding:1px 5px 4px; border:2px solid #000; border-radius:3px; line-height:1; text-align:center; overflow:visible; }
  .items-qty-n { display:inline-block; transform:translateY(-2px); font-weight:800; font-size:${Math.max(8, fonteItens - 2)}px; line-height:1; white-space:nowrap; }
  .item-row { padding:${itemRowPy}px 0; font-size:${fonteItens}px; }
  .item-title, .item-title .label, .item-title .value { font-weight:${peso(negritoItens)}; font-size:${fonteItens}px; line-height:1.15; }
  .row-line { display:flex; justify-content:space-between; align-items:baseline; gap:8px; width:100%; max-width:100%; box-sizing:border-box; overflow:hidden; }
  .row-line .label { flex:1 1 0; min-width:0; text-align:left; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .row-line .value { flex:0 0 auto; text-align:right; white-space:nowrap; }
  .item-comps, .item-comps .label, .item-comps .value { padding-left:0; font-size:${fonteItens}px; font-weight:800; color:#000; -webkit-font-smoothing:none; }
  .item-comps { padding-left:12px; }
  .item-comp-sign { display:inline-block; min-width:0.7em; font-weight:900; font-size:1.2em; line-height:1; }
  .item-note { padding-left:12px; font-size:${fonteItens}px; font-weight:800; color:#000; }
  .obs-box { margin:${Math.max(6, padding + 2)}px 0; padding:3px 8px 7px; border:2px solid #000; border-radius:4px; text-align:center; line-height:1.15; }
  .obs-title { font-weight:800; font-size:${fontePedido}px; letter-spacing:.02em; line-height:1.1; }
  .obs-text { margin-top:1px; font-weight:800; font-size:${fonteItens + 1}px; line-height:1.15; overflow-wrap:anywhere; word-break:break-word; }
  .summary-section, .summary-section strong { font-size:${fonteResumo}px; font-weight:${peso(negritoResumo)}; }
  .summary-section .items-title { font-size:${fonteResumo}px; font-weight:${peso(negritoResumo)}; }
  .payment-section, .payment-section strong { font-size:${fontePagamento}px; font-weight:${peso(negritoPagamento)}; }
  .charge, .paid { text-align:center; font-weight:${negritoPagamento ? 900 : 400}; }
  .charge-box { box-sizing:border-box; padding:4px 8px 10px; border:2px solid #000; border-radius:4px; line-height:1; text-align:center; }
  .charge-linha { display:block; margin:0; padding:0; font-size:${fontePagamento}px; font-weight:700; line-height:1; }
  .charge-linha strong { font-size:inherit; font-weight:800; line-height:1; }
  .charge-troco { margin-top:4px; font-weight:700; }
  .extra-header { margin-top:${extraMt}px; font-size:${Math.max(8, fonteRodape)}px; white-space:normal; font-weight:${peso(negritoCabecalho)}; }
  .extra-footer { margin-top:${extraMt}px; font-size:${Math.max(8, fonteRodape)}px; white-space:normal; font-weight:${peso(negritoRodape)}; }
  .footer { margin-top:${footerMt}px; font-size:${fonteRodape}px; text-align:center; font-weight:${peso(negritoRodape)}; }
  .printed-at { color:#000; }
  .prod-80 { font-family:'EscPosFontA', ui-monospace, monospace; padding-bottom:48px; }
  .prod-banner { text-align:center; font-weight:800; font-size:${fontePedido}px; line-height:1.1; }
  .prod-pill { background:#000; color:#fff; border-radius:2px; text-align:center; font-weight:800; margin:0 4px 6px; line-height:1.1; }
  .prod-pill-senha { font-size:${Math.max(16, Math.round((40 * w) / 576))}px; padding:2px 16px; letter-spacing:.12em; }
  .prod-pill-id { font-size:${Math.max(14, Math.round((30 * w) / 576))}px; padding:3px 12px; }
  .prod-pill-codigo { font-size:${Math.max(22, Math.round((46 * w) / 576))}px; padding:6px 8px 8px; letter-spacing:.1em; }
  .prod-meta { text-align:center; font-weight:800; font-size:${Math.max(9, fonteRodape)}px; letter-spacing:.08em; }
  .prod-80 .prod-item { font-family:'EscPosFontA', ui-monospace, monospace; font-weight:800; font-size:${fonteProduto}px; line-height:1; white-space:pre-wrap; -webkit-font-smoothing:none; }
  .prod-80 .prod-extra { font-family:'EscPosFontA', ui-monospace, monospace; font-weight:800; font-size:${Math.max(12, Math.round(fonteProduto * 0.72))}px; line-height:1.05; white-space:pre; margin-top:2px; }
  .prod-obs { margin:6px 4px; padding:4px 8px 8px; border:2px solid #000; border-radius:4px; text-align:center; }
  .prod-obs-title { font-weight:800; font-size:${Math.max(10, fontePedido)}px; letter-spacing:.04em; }
  .prod-obs-text { margin-top:2px; font-weight:800; font-size:${Math.max(12, fonteItens + 1)}px; overflow-wrap:anywhere; }
  .prod-resumo, .prod-rodape { text-align:center; font-weight:800; letter-spacing:.08em; font-size:${Math.max(9, fonteRodape)}px; }
  .prod-resumo { margin-top:2px; }
  .prod-rodape { margin-top:8px; padding-bottom:8px; }
</style>
</head><body>
<div class="receipt" data-densidade="${template.densidade}">
  ${
    ticket.tipoCupom === 'producao'
      ? renderProducao(input, template, cabecalhoExtra, rodapeExtra)
      : renderExpedicao(input, template, cabecalhoExtra, rodapeExtra)
  }
</div>
</body></html>`
}

