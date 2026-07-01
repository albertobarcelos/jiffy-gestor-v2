/**
 * Converte o HTML do cupom delivery (renderDeliveryCupomHtml) em bytes ESC/POS
 * para impressoras térmicas via TCP (Bematech, Epson, etc.).
 *
 * O QZ pixel/html não funciona em raw TCP; o conversor nativo do QZ ignora
 * nosso `<style>` com classes. Este mapeamento conhece as classes do template.
 */

const ESC = '\x1B'
const GS = '\x1D'

const CMD = {
  init: `${ESC}@`,
  cp850: `${ESC}t\x02`,
  boldOn: `${ESC}E\x01`,
  boldOff: `${ESC}E\x00`,
  alignLeft: `${ESC}a\x00`,
  alignCenter: `${ESC}a\x01`,
  alignRight: `${ESC}a\x02`,
  sizeNormal: `${GS}!\x00`,
  sizeDouble: `${GS}!\x11`,
  sizeTall: `${GS}!\x01`,
  cutPartial: `${GS}VA\x05`,
} as const

const CHARS_58MM = 32
const CHARS_80MM = 48

function larguraColunasDoHtml(html: string): number {
  if (/\bwidth:\s*220px\b/.test(html) || /\b58\s*mm\b/i.test(html)) return CHARS_58MM
  return CHARS_80MM
}

function normalizarEspacos(texto: string): string {
  return texto.replace(/\s+/g, ' ').trim()
}

function quebrarTexto(texto: string, largura: number): string[] {
  const t = normalizarEspacos(texto)
  if (!t) return []
  if (t.length <= largura) return [t]

  const linhas: string[] = []
  let restante = t
  while (restante.length > largura) {
    let corte = restante.lastIndexOf(' ', largura)
    if (corte <= 0) corte = largura
    linhas.push(restante.slice(0, corte).trim())
    restante = restante.slice(corte).trim()
  }
  if (restante) linhas.push(restante)
  return linhas
}

function linhaSeparadora(largura: number): string {
  return '-'.repeat(largura)
}

function linhaDuasColunas(label: string, valor: string | null, largura: number): string[] {
  const esq = normalizarEspacos(label)
  const dir = valor ? normalizarEspacos(valor) : ''
  if (!dir) return quebrarTexto(esq, largura)
  if (esq.length + 1 + dir.length <= largura) {
    return [`${esq}${' '.repeat(largura - esq.length - dir.length)}${dir}`]
  }
  return [...quebrarTexto(esq, largura), dir.padStart(largura)]
}

type EstadoEscPos = {
  align: 'left' | 'center' | 'right'
  bold: boolean
  size: 'normal' | 'tall' | 'double'
}

class EscPosBuilder {
  private readonly partes: string[] = []
  private estado: EstadoEscPos = { align: 'left', bold: false, size: 'normal' }

  constructor(private readonly largura: number) {
    this.partes.push(CMD.init, CMD.cp850)
    this.aplicarEstado()
  }

  private aplicarEstado(): void {
    this.partes.push(
      this.estado.align === 'center'
        ? CMD.alignCenter
        : this.estado.align === 'right'
          ? CMD.alignRight
          : CMD.alignLeft,
      this.estado.bold ? CMD.boldOn : CMD.boldOff,
      this.estado.size === 'double'
        ? CMD.sizeDouble
        : this.estado.size === 'tall'
          ? CMD.sizeTall
          : CMD.sizeNormal
    )
  }

  patchEstado(partial: Partial<EstadoEscPos>): void {
    const next = { ...this.estado, ...partial }
    if (
      next.align === this.estado.align &&
      next.bold === this.estado.bold &&
      next.size === this.estado.size
    ) {
      this.estado = next
      return
    }
    this.estado = next
    this.aplicarEstado()
  }

  nl(): void {
    this.partes.push('\n')
  }

  texto(raw: string): void {
    const linhas = raw.split('\n')
    linhas.forEach((linha, i) => {
      const pedacos = quebrarTexto(linha, this.largura)
      if (pedacos.length === 0) {
        if (i < linhas.length - 1) this.nl()
        return
      }
      pedacos.forEach(p => {
        this.partes.push(p)
        this.nl()
      })
    })
  }

  linha(linhas: string[]): void {
    linhas.forEach(l => {
      this.partes.push(l)
      this.nl()
    })
  }

  separador(): void {
    this.patchEstado({ align: 'left', bold: false, size: 'normal' })
    this.linha([linhaSeparadora(this.largura)])
  }

  linhaColunas(label: string, valor: string | null, opts?: { bold?: boolean }): void {
    this.patchEstado({ align: 'left', bold: opts?.bold ?? false, size: 'normal' })
    this.linha(linhaDuasColunas(label, valor, this.largura))
  }

  bloco(fn: () => void, estado: Partial<EstadoEscPos>): void {
    const anterior = { ...this.estado }
    this.patchEstado(estado)
    fn()
    this.patchEstado(anterior)
  }

  finalizar(): string {
    this.patchEstado({ align: 'left', bold: false, size: 'normal' })
    this.nl()
    this.nl()
    this.nl()
    this.partes.push(CMD.cutPartial)
    return this.partes.join('')
  }
}

function classes(el: Element): string[] {
  return (el.className || '')
    .split(/\s+/)
    .map(c => c.trim())
    .filter(Boolean)
}

function temClasse(el: Element, nome: string): boolean {
  return classes(el).includes(nome)
}

function textoInline(el: Element): string {
  let out = ''
  el.childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.textContent ?? ''
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const child = node as Element
    const tag = child.tagName.toLowerCase()
    if (tag === 'br') {
      out += '\n'
      return
    }
    out += textoInline(child)
  })
  return out
}

function processarRowLine(el: Element, b: EscPosBuilder, opts?: { bold?: boolean }): void {
  const labelEl = el.querySelector('.label')
  const valueEl = el.querySelector('.value')
  const label = labelEl ? textoInline(labelEl) : textoInline(el)
  const value = valueEl ? textoInline(valueEl) : null
  b.linhaColunas(label, value, opts)
}

function processarElemento(el: Element, b: EscPosBuilder, ctx: { indent: number }): void {
  if (el.tagName.toLowerCase() === 'img') return

  if (temClasse(el, 'separator') || temClasse(el, 'double-separator')) {
    b.separador()
    return
  }

  if (temClasse(el, 'header')) {
    b.bloco(() => el.childNodes.forEach(n => processarNode(n, b, ctx)), {
      align: 'center',
      bold: false,
      size: 'normal',
    })
    return
  }

  if (temClasse(el, 'brand')) {
    b.bloco(() => b.texto(textoInline(el)), { align: 'center', bold: true, size: 'double' })
    return
  }

  if (temClasse(el, 'method')) {
    b.bloco(() => b.texto(textoInline(el)), { align: 'center', bold: true, size: 'tall' })
    return
  }

  if (temClasse(el, 'items-title')) {
    b.bloco(() => b.texto(textoInline(el)), { align: 'left', bold: true, size: 'normal' })
    return
  }

  if (temClasse(el, 'charge') || temClasse(el, 'paid')) {
    b.bloco(() => b.texto(textoInline(el)), { align: 'center', bold: true, size: 'tall' })
    return
  }

  if (temClasse(el, 'footer') || temClasse(el, 'printed-at')) {
    b.bloco(() => el.childNodes.forEach(n => processarNode(n, b, ctx)), {
      align: 'center',
      bold: false,
      size: 'normal',
    })
    return
  }

  if (temClasse(el, 'row-line')) {
    processarRowLine(el, b, { bold: Boolean(el.querySelector('strong')) })
    return
  }

  if (temClasse(el, 'item-comps')) {
    const row = el.querySelector('.row-line')
    if (row) {
      const labelEl = row.querySelector('.label')
      const valueEl = row.querySelector('.value')
      const label = `  ${labelEl ? textoInline(labelEl) : textoInline(row)}`
      const value = valueEl ? textoInline(valueEl) : null
      b.linhaColunas(label, value)
      return
    }
  }

  if (temClasse(el, 'item-note')) {
    b.patchEstado({ align: 'left', bold: false, size: 'normal' })
    b.texto(`  * ${textoInline(el)}`)
    return
  }

  if (temClasse(el, 'item-row')) {
    el.childNodes.forEach(n => processarNode(n, b, ctx))
    return
  }

  if (temClasse(el, 'item-title')) {
    const row = el.querySelector('.row-line')
    if (row) {
      processarRowLine(row, b, { bold: true })
      return
    }
  }

  if (temClasse(el, 'obs')) {
    b.patchEstado({ align: 'left', bold: false, size: 'normal' })
    b.texto(textoInline(el))
    return
  }

  if (temClasse(el, 'whatsapp-qr')) {
    const texto = Array.from(el.querySelectorAll('div'))
      .map(d => textoInline(d))
      .filter(Boolean)
      .join(' ')
    if (texto) {
      b.patchEstado({ align: 'left', bold: true, size: 'normal' })
      b.texto(texto)
    }
    return
  }

  if (temClasse(el, 'section') || temClasse(el, 'extra-header') || temClasse(el, 'extra-footer')) {
    el.childNodes.forEach(n => processarNode(n, b, ctx))
    return
  }

  if (temClasse(el, 'summary-section') || temClasse(el, 'payment-section')) {
    el.childNodes.forEach(n => processarNode(n, b, ctx))
    return
  }

  const tag = el.tagName.toLowerCase()
  if (tag === 'strong' || tag === 'b') {
    b.bloco(() => b.texto(textoInline(el)), { bold: true })
    return
  }

  if (tag === 'div' || tag === 'p') {
    const hasStructuralChild = el.querySelector(
      '.row-line, .separator, .double-separator, .item-row, .header, .brand, .method, .items-title, .charge, .paid, .footer'
    )
    if (!hasStructuralChild) {
      const inline = textoInline(el)
      if (inline) {
        b.patchEstado({ align: 'left', bold: false, size: 'normal' })
        b.texto(inline)
        return
      }
    }
    el.childNodes.forEach(n => processarNode(n, b, ctx))
    return
  }

  el.childNodes.forEach(n => processarNode(n, b, ctx))
}

function processarNode(node: Node, b: EscPosBuilder, ctx: { indent: number }): void {
  if (node.nodeType === Node.TEXT_NODE) {
    const t = normalizarEspacos(node.textContent ?? '')
    if (t) {
      b.patchEstado({ align: 'left', bold: false, size: 'normal' })
      b.texto(t)
    }
    return
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return
  processarElemento(node as Element, b, ctx)
}

/** Converte HTML do cupom delivery em string ESC/POS pronta para `qz.print` raw TCP. */
export function deliveryCupomHtmlParaEscPos(html: string): string {
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return `${CMD.init}${CMD.cp850}${html.replace(/<[^>]+>/g, '\n')}${CMD.cutPartial}`
  }

  const largura = larguraColunasDoHtml(html)
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const raiz = doc.querySelector('.receipt') ?? doc.body
  const b = new EscPosBuilder(largura)

  raiz.childNodes.forEach(n => processarNode(n, b, { indent: 0 }))
  return b.finalizar()
}
