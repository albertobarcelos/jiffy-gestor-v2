import {
  identidadePrimariaEhTipoAvulso,
  montarModeloProducao80mm,
  PRODUCAO_80MM,
  textoEscPosProducao,
  type ModeloProducao80mm,
} from '@/src/application/delivery/layoutProducao80mm'
import {
  origemModeloProducaoDeTicket,
  type OrigemModeloProducaoDeTicketOptions,
} from '@/src/application/delivery/origemModeloProducao'
import { desenharPilulaProducaoPng } from '@/src/infrastructure/printing/pilulaProducaoPng'
import type {
  PrintAlign,
  PrintContentBlock,
  PrintDocument,
  PrintSize,
} from '@/src/infrastructure/printing/agent/printJobTypes'
import type { VendaGestorTicket, VendaGestorTicketsResponse } from '@/src/shared/types/vendaGestorTickets'

export type MapTicketToProducaoHibridoOptions = OrigemModeloProducaoDeTicketOptions

const SIZE_COMPLEMENTO: PrintSize = 'double-b'

function pushTexto(
  content: PrintContentBlock[],
  text: string,
  opts: { align?: PrintAlign; bold?: boolean; size?: PrintSize }
): void {
  if (!text) return
  content.push({
    type: 'text',
    text,
    align: opts.align,
    bold: opts.bold,
    size: opts.size,
  })
}

function pushPilula(
  content: PrintContentBlock[],
  texto: string,
  variante: 'senha' | 'identidade' | 'codigo'
): void {
  const png = desenharPilulaProducaoPng(texto, variante)
  if (png) {
    content.push({ type: 'image', data: png, align: 'center' })
    return
  }
  pushTexto(content, texto, { align: 'center', bold: true, size: 'double' })
}

export function modeloToProducaoHibridoContent(modelo: ModeloProducao80mm): PrintContentBlock[] {
  const content: PrintContentBlock[] = []
  if (modelo.reimpressao) {
    pushTexto(content, '** REIMPRESSAO **', { align: 'center', bold: true, size: 'normal' })
  }
  if (modelo.senha) pushPilula(content, modelo.senha, 'senha')
  if (modelo.conferencia) {
    pushTexto(content, '*** VIA DE CONFERENCIA ***', { align: 'center', bold: true, size: 'normal' })
  }
  if (modelo.unidade) pushPilula(content, modelo.unidade, 'codigo')
  if (modelo.identidade.primaria) {
    pushPilula(
      content,
      modelo.identidade.primaria,
      identidadePrimariaEhTipoAvulso(modelo.identidade.primaria) ? 'identidade' : 'codigo'
    )
  }
  if (modelo.identidade.secundaria) pushPilula(content, modelo.identidade.secundaria, 'identidade')
  content.push({ type: 'divider' })
  for (const item of modelo.itens) {
    pushTexto(content, item.produto, { align: 'left', bold: true, size: 'double' })
    for (const extra of item.extras) {
      content.push({ type: 'text', text: extra, align: 'left', bold: true, size: SIZE_COMPLEMENTO })
    }
    content.push({ type: 'divider' })
  }
  if (modelo.itens.length === 0) content.push({ type: 'divider' })
  if (modelo.observacaoPedido) {
    pushTexto(content, 'OBSERVACAO DO PEDIDO', { align: 'center', bold: true, size: 'normal' })
    pushTexto(content, modelo.observacaoPedido, {
      align: 'center',
      bold: true,
      size: SIZE_COMPLEMENTO,
    })
    content.push({ type: 'divider' })
  }
  pushTexto(content, textoEscPosProducao(modelo.resumo), {
    align: 'center',
    bold: true,
    size: 'small',
  })
  for (const linha of modelo.rodape) {
    pushTexto(content, linha, { align: 'center', bold: true, size: 'small' })
  }
  content.push({ type: 'feed', lines: PRODUCAO_80MM.linhasAntesDoCorte })
  content.push({ type: 'cut' })
  return content
}

export function mapTicketToProducaoHibridoDocument(
  root: VendaGestorTicketsResponse,
  ticket: VendaGestorTicket,
  options?: MapTicketToProducaoHibridoOptions
): PrintDocument {
  const modelo = montarModeloProducao80mm(origemModeloProducaoDeTicket(root, ticket, options))
  return {
    type: 'ORDER',
    columns: PRODUCAO_80MM.colunasFonteA,
    content: modeloToProducaoHibridoContent(modelo),
  }
}
