import type {
  VendaGestorTicket,
  VendaGestorTicketItem,
  VendaGestorTicketItemComplemento,
  VendaGestorTicketsEndereco,
  VendaGestorTicketsResponse,
} from '@/src/shared/types/vendaGestorTickets'
import {
  DEFAULT_DELIVERY_CUPOM_TEMPLATE,
  type DeliveryCupomModeloFonteConfig,
  type DeliveryCupomTemplateConfig,
} from '@/src/shared/types/deliveryCupomTemplate'

export interface RenderDeliveryCupomHtmlInput {
  root: VendaGestorTicketsResponse
  ticket: VendaGestorTicket
  nomeEmpresa?: string
  template?: DeliveryCupomTemplateConfig
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

function labelMeioPagamentoCupom(raw: string): string {
  const t = raw.trim()
  if (!t) return ''
  if (/[a-záàâãéêíóôõúç]/.test(t)) return t
  return t
    .toLowerCase()
    .split(/\s+/)
    .map(word => (word ? word.charAt(0).toUpperCase() + word.slice(1) : ''))
    .join(' ')
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
  if (densidade === 'compacto') return 2
  if (densidade === 'espacoso') return 12
  return 8
}

function lineHeightPorDensidade(densidade: DeliveryCupomTemplateConfig['densidade']): number {
  if (densidade === 'compacto') return 1.1
  if (densidade === 'espacoso') return 1.5
  return 1.35
}

function fonteBloco(v: number | null | undefined, fallback: number): number {
  return Math.min(18, Math.max(8, Math.floor(v ?? fallback)))
}

function fontesDoModelo(
  template: DeliveryCupomTemplateConfig,
  tipoCupom: VendaGestorTicket['tipoCupom']
): DeliveryCupomModeloFonteConfig {
  const modelo = tipoCupom === 'producao' ? 'producao' : 'expedicao'
  return template.fontesPorModelo?.[modelo] ?? DEFAULT_DELIVERY_CUPOM_TEMPLATE.fontesPorModelo[modelo]
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

function renderLinhaValor(labelHtml: string, valorHtml: string | null, options?: { strong?: boolean }): string {
  if (!valorHtml) {
    return `<div class="row-line"><span class="label">${labelHtml}</span></div>`
  }
  const tag = options?.strong ? 'strong' : 'span'
  return `<div class="row-line"><${tag} class="label">${labelHtml}</${tag}><${tag} class="value">${valorHtml}</${tag}></div>`
}

function renderItens(
  ticket: VendaGestorTicket,
  template: DeliveryCupomTemplateConfig,
  options: { mostrarValores: boolean }
): string {
  const produtoWeight = template.destacarProdutos ? 800 : 600
  return (ticket.itens ?? [])
    .map(p => {
      const q = quantidadeItem(p)
      const nome = escapeHtml((p.nomeProduto ?? 'Item').trim() || 'Item')
      const valor = valorItem(p)
      const preco =
        options.mostrarValores && valor != null ? escapeHtml(fmtBrl(valor)) : null
      const obs =
        typeof p.observacao === 'string' && p.observacao.trim()
          ? `<div class="item-note">${escapeHtml(p.observacao.trim())}</div>`
          : ''
      const compParts = Array.isArray(p.complementos) ? p.complementos : []
      const compHtml = compParts
        .map(c => {
          const label = labelComplemento(c)
          if (!label) return ''
          const valorComp = valorComplemento(c)
          const precoComp =
            options.mostrarValores && valorComp != null ? escapeHtml(fmtBrl(valorComp)) : null
          return `<div class="item-comps">${renderLinhaValor(escapeHtml(label), precoComp)}</div>`
        })
        .filter(Boolean)
        .join('')

      const tituloHtml = renderLinhaValor(`${q} X ${nome}`, preco)

      return `<div class="item-row">
        <div class="item-title" style="font-weight:${produtoWeight};">${tituloHtml}</div>
        ${compHtml}
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
    <div class="method">${pedido ? `${pedido} ` : ''}${escapeHtml(tipoVenda)}${codigo ? ` <strong>${escapeHtml(codigo)}</strong>` : ''}</div>
    ${cabecalhoExtra}
  </div>
  <div class="separator"></div>`
}

function renderMetaPedido(root: VendaGestorTicketsResponse, incluirEntregador: boolean): string {
  const dataPedido = fmtDateTime(root.dataPedido || root.rastreamento?.geradoEm)
  const dataPrevista = fmtDateTime(root.dataPrevista)
  const entregador = incluirEntregador ? nomeEntregador(root) : ''

  return `<div class="section meta-section">
    ${dataPedido ? `<div><strong>Data:</strong> ${escapeHtml(dataPedido)}</div>` : ''}
    ${dataPrevista ? `<div><strong>Data Prevista:</strong> ${escapeHtml(dataPrevista)}</div>` : ''}
    ${entregador ? `<div class="separator"></div><div><strong>Entregador:</strong> ${escapeHtml(entregador)}</div>` : ''}
  </div>`
}

function renderRodape(template: DeliveryCupomTemplateConfig, rodapeExtra: string): string {
  return `<div class="footer">
    ${rodapeExtra}
    <div>Feito com carinho ♥ por Jiffy POS</div>
    ${template.mostrarDataHora ? `<div class="printed-at">${escapeHtml(new Date().toLocaleString('pt-BR'))}</div>` : ''}
  </div>`
}

function renderProducao(
  input: RenderDeliveryCupomHtmlInput,
  template: DeliveryCupomTemplateConfig,
  cabecalhoExtra: string,
  rodapeExtra: string
): string {
  const root = input.root
  const ticket = input.ticket
  const empresa = nomeEmpresa(root, input.nomeEmpresa?.trim() || 'Jiffy Gestor')
  const cliente = root.cliente?.nome?.trim() || '—'
  const obsPedido =
    template.mostrarObservacaoPedido && root.observacaoPedido?.trim()
      ? `<div class="obs"><strong>Obs. pedido:</strong> ${escapeHtml(root.observacaoPedido.trim())}</div>`
      : ''

  return `${renderCabecalho(root, template, empresa, cabecalhoExtra)}
  ${renderMetaPedido(root, true)}
  <div class="separator"></div>
  <div class="section customer-section" style="white-space: normal; word-wrap: break-word; overflow-wrap: break-word; word-break: normal;"><strong>Cliente:</strong> ${escapeHtml(cliente)}</div>
  <div class="separator"></div>
  <div class="items-title">ITENS DO PEDIDO (${totalItensPedido(ticket)})</div>
  ${renderItens(ticket, template, { mostrarValores: false })}
  ${obsPedido}
  <div class="separator"></div>
  ${renderRodape(template, rodapeExtra)}`
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
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=74x74&margin=0&data=${encodeURIComponent(url)}`

  return `<div class="whatsapp-qr">
    <img src="${escapeHtml(qrSrc)}" alt="QR Code WhatsApp" width="74" height="74" />
    <div>Scaneie e fale com o cliente via WhatsApp</div>
  </div>`
}

function renderResumoExpedicao(root: VendaGestorTicketsResponse, ticket: VendaGestorTicket): string {
  const resumo = resumoPedido(root, ticket)
  const p = root.pagamento
  const total = numeroFinito(root.resumoPedido?.valorTotal) ?? numeroFinito(root.valorFinal) ?? 0
  const status = String(p?.status || '').toLowerCase()
  const faltante = numeroFinito(p?.valorFaltante) ?? (status === 'pago' ? 0 : total)
  const recebido = numeroFinito(p?.valorRecebido) ?? 0

  let pagamentosHtml = ''
  if (recebido > 0) {
    const meios = p?.meios?.length
      ? p.meios
          .map(m => {
            const nome = m.nome || m.tipo || 'PAGO'
            const valor = numeroFinito(m.valor) ?? recebido
            return renderLinhaValor(
              `Pago em ${escapeHtml(nome.toUpperCase())}:`,
              escapeHtml(fmtBrl(valor))
            )
          })
          .join('')
      : renderLinhaValor('Valor Pago:', escapeHtml(fmtBrl(recebido)))

    pagamentosHtml = `
    ${meios}
    ${
      faltante > 0
        ? renderLinhaValor('Falta Pagar:', escapeHtml(fmtBrl(faltante)), { strong: true })
        : ''
    }`
  }

  return `<div class="separator"></div>
  <div class="summary-section">
    <div class="items-title">RESUMO PEDIDO</div>
    ${renderLinhaValor('Valor total dos itens:', escapeHtml(fmtBrl(resumo.valorItens)))}
    ${renderLinhaValor('Adicionais:', escapeHtml(fmtBrl(resumo.valorAdicionais)))}
    ${renderLinhaValor('Taxa de Entrega:', escapeHtml(fmtBrl(resumo.taxaEntrega)))}
    ${renderLinhaValor('Total do Pedido:', escapeHtml(fmtBrl(resumo.valorTotal)), { strong: true })}
    ${pagamentosHtml}
  </div>`
}

function renderPagamento(root: VendaGestorTicketsResponse): string {
  const p = root.pagamento
  const total = numeroFinito(root.resumoPedido?.valorTotal) ?? numeroFinito(root.valorFinal) ?? 0
  const status = String(p?.status || '').toLowerCase()
  const faltante = numeroFinito(p?.valorFaltante) ?? (status === 'pago' ? 0 : total)
  const recebido = numeroFinito(p?.valorRecebido) ?? 0
  const receber = numeroFinito(p?.valorCobrarNaEntrega) ?? 0
  const meio = p?.meioPagamento || p?.formaPagamento || p?.meios?.[0]?.nome || p?.meios?.[0]?.tipo || ''
  const meioLabel = meio ? labelMeioPagamentoCupom(meio) : ''
  const trocoCalculado = numeroFinito(p?.trocoParaLevar) ?? 0
  const trocoHtml =
    trocoCalculado > 0
      ? `<div style="display: block; word-wrap: break-word; text-align: right;"><strong>Levar troco:</strong> ${fmtBrl(trocoCalculado)}</div>`
      : ''
  const deveCobrar = p?.cobrarCliente === true || status === 'pendente' || (!status && receber > 0)

  if (deveCobrar) {
    return `<div class="double-separator"></div>
    <div class="payment-section">
      <div class="charge">COBRAR DO CLIENTE</div>
      <div style="display: block; word-wrap: break-word; text-align: center; margin-top: 4px;">
        <strong>Cobrar na entrega:</strong><br/>
        ${fmtBrl(receber)}
      </div>
      ${meioLabel ? `<div style="display: block; word-wrap: break-word; text-align: center; margin-top: 4px;">Pag. : ${escapeHtml(meioLabel)}</div>` : ''}
      ${trocoHtml}
    </div>`
  }

  const meios = p?.meios?.length
    ? p.meios
        .map(m => {
          const nome = m.nome || m.tipo || 'PAGO'
          const valor = numeroFinito(m.valor) ?? recebido ?? total
          return `<div><span>${escapeHtml(nome.toUpperCase())}:</span> ${fmtBrl(valor)}</div>`
        })
        .join('')
    : `<div><span>${escapeHtml((meio || 'PAGO').toUpperCase())}:</span> ${fmtBrl(recebido ?? total - faltante)}</div>`

  return `<div class="double-separator"></div>
  <div class="payment-section">
    <div class="paid">PEDIDO PAGO</div>
    ${meios}
    ${faltante > 0 ? `<div><strong>FALTA:</strong> ${fmtBrl(Math.max(0, faltante))}</div>` : ''}
    ${trocoHtml}
  </div>
  <div class="separator"></div>`
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
  const obsPedido =
    template.mostrarObservacaoPedido && root.observacaoPedido?.trim()
      ? `<div class="obs"><strong>Obs. pedido:</strong> ${escapeHtml(root.observacaoPedido.trim())}</div>`
      : ''

  return `${renderCabecalho(root, template, empresa, cabecalhoExtra)}
  ${renderMetaPedido(root, false)}
  <div class="separator"></div>
  <div class="section customer-section" style="white-space: normal; word-wrap: break-word; overflow-wrap: break-word; word-break: normal;">
    <div style="margin-bottom: 1px;"><strong>CLIENTE:</strong> ${escapeHtml(cliente)}</div>
    ${template.mostrarTelefoneCliente && telefoneFormatado ? `<div style="margin-bottom: 1px;"><strong>TELEFONE:</strong> ${escapeHtml(telefoneFormatado)}</div>` : ''}
  </div>
  ${renderEnderecoExpedicao(root, template)}
  ${renderWhatsappQr(tel)}
  <div class="separator"></div>
  <div class="items-title">ITENS DO PEDIDO (${totalItensPedido(ticket)})</div>
  ${renderItens(ticket, template, { mostrarValores: template.mostrarValores })}
  ${obsPedido}
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
  const paddingLateral = padding + margemLateralPx
  const valueColPx = w <= 220 ? 58 : 68
  const separatorPy = padding <= 2 ? 5 : padding >= 12 ? 16 : 12
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

  const cabecalhoExtra = template.cabecalhoExtra.trim()
    ? `<div class="extra-header">${escapeMultiline(template.cabecalhoExtra.trim())}</div>`
    : ''
  const rodapeExtra = template.rodapeExtra.trim()
    ? `<div class="extra-footer">${escapeMultiline(template.rodapeExtra.trim())}</div>`
    : ''

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  html, body { margin:0; overflow-x:hidden; }
  body { width:${w}px; max-width:100%; margin-left:auto; margin-right:auto; font-family: system-ui, -apple-system, Segoe UI, sans-serif; color:#111; }
  .receipt { box-sizing:border-box; width:100%; max-width:100%; margin:0; padding:2px ${paddingLateral}px ${padding}px ${paddingLateral}px; font-size:${template.tamanhoFonteBase}px; line-height:${lineHeight}; overflow-x:hidden; }
  .header { text-align:center; padding-bottom:${Math.max(2, Math.floor(padding / 2))}px; margin-bottom:${Math.max(2, Math.floor(padding / 2))}px; font-size:${fonteCabecalho}px; }
  .brand { font-weight:800; font-size:${fonteCabecalho + 1}px; letter-spacing:.02em; }
  .method { display:inline-block; margin-top:4px; padding:2px 8px; font-weight:900; font-size:${fonteCabecalho + 5}px; border:2px solid #000; border-radius:4px; }
  .section { margin:${padding}px 0; }
  .meta-section { font-size:${fontePedido}px; }
  .customer-section, .address-section { font-size:${fonteClienteEndereco}px; }
  .whatsapp-qr { margin:${Math.max(3, Math.floor(padding / 2))}px 0; display:flex; align-items:center; justify-content:flex-start; gap:6px; font-size:10px; font-weight:700; line-height:1.15; }
  .whatsapp-qr img { display:block; width:74px; height:74px; flex:0 0 auto; image-rendering:pixelated; }
  .whatsapp-qr div { max-width:130px; text-align:left; }
  .separator { width:100%; margin:${separatorPy}px 0; padding:0; border:0; box-sizing:border-box; overflow:hidden; white-space:nowrap; line-height:1; color:#000; font-weight:900; font-size:${fonteCabecalho + 2}px; }
  .separator::before { content:"------------------------------------------------------------------------------------------"; letter-spacing:-.5px; }
  .double-separator { width:100%; margin:${separatorPy}px 0; padding:0; border:0; box-sizing:border-box; overflow:hidden; line-height:1.2; color:#000; font-weight:900; font-size:${fonteCabecalho + 2}px; }
  .double-separator::before { content:"------------------------------------------------------------------------------------------\A------------------------------------------------------------------------------------------"; white-space:pre; letter-spacing:-.5px; }
  .items-title { margin:${padding}px 0 3px; font-weight:800; font-size:${fonteItens}px; }
  .item-row { padding:3px 0; font-size:${fonteItens}px; }
  .row-line { display:flex; justify-content:space-between; align-items:flex-start; gap:4px; width:100%; max-width:100%; box-sizing:border-box; }
  .row-line .label { flex:1 1 0; min-width:0; text-align:left; overflow-wrap:anywhere; word-break:break-word; }
  .row-line .value { flex:0 0 ${valueColPx}px; width:${valueColPx}px; min-width:${valueColPx}px; text-align:right; white-space:nowrap; }
  .item-comps { padding-left:16px; font-size:${Math.max(8, fonteItens - 1)}px; color:#222; }
  .item-note { padding-left:28px; font-size:${Math.max(8, fonteItens - 1)}px; color:#333; }
  .obs { margin:${padding}px 0; font-size:${Math.max(8, fonteItens - 2)}px; }
  .summary-section { font-size:${fonteResumo}px; }
  .summary-section .items-title { font-size:${fonteResumo}px; }
  .payment-section { font-size:${fontePagamento}px; }
  .charge, .paid { text-align:center; font-weight:900; }
  .extra-header, .extra-footer { margin-top:6px; font-size:${Math.max(8, fonteRodape)}px; white-space:normal; }
  .footer { margin-top:12px; font-size:${fonteRodape}px; text-align:center; }
  .printed-at { color:#555; }
</style>
</head><body>
<div class="receipt">
  ${
    ticket.tipoCupom === 'producao'
      ? renderProducao(input, template, cabecalhoExtra, rodapeExtra)
      : renderExpedicao(input, template, cabecalhoExtra, rodapeExtra)
  }
</div>
</body></html>`
}

