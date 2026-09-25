import {
  dotsEntreModificadoresProducao,
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
import type { DesenharPilulaProducao } from '@/src/application/ports/IDesenharPilulaProducao'
import type {
  PrintAlign,
  PrintContentBlock,
  PrintDocument,
  PrintSize,
} from '@/src/application/ports/printDocument'
import type { VendaGestorTicket, VendaGestorTicketsResponse } from '@/src/shared/types/vendaGestorTickets'

export type DesenharSeparadorProducao = () => string | null

export type MapTicketToProducaoHibridoOptions = OrigemModeloProducaoDeTicketOptions & {
  desenharPilula?: DesenharPilulaProducao
  desenharSeparador?: DesenharSeparadorProducao
}

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

function pushSeparador(
  content: PrintContentBlock[],
  desenharSeparador?: DesenharSeparadorProducao
): void {
  const png = desenharSeparador?.()
  if (png) {
    content.push({ type: 'image', data: png, align: 'center' })
    return
  }
  content.push({ type: 'divider' })
}

function pushPilula(
  content: PrintContentBlock[],
  texto: string,
  variante: 'senha' | 'identidade' | 'codigo',
  desenharPilula?: DesenharPilulaProducao
): void {
  const png = desenharPilula?.(texto, variante)
  if (png) {
    content.push({ type: 'image', data: png, align: 'center' })
    return
  }
  pushTexto(content, texto, { align: 'center', bold: true, size: 'double' })
}

export function modeloToProducaoHibridoContent(
  modelo: ModeloProducao80mm,
  desenharPilula?: DesenharPilulaProducao,
  desenharSeparador?: DesenharSeparadorProducao
): PrintContentBlock[] {
  const content: PrintContentBlock[] = []
  if (modelo.reimpressao) {
    pushTexto(content, '** REIMPRESSAO **', { align: 'center', bold: true, size: 'normal' })
  }
  if (modelo.senha) pushPilula(content, modelo.senha, 'senha', desenharPilula)
  if (modelo.conferencia) {
    pushTexto(content, '*** VIA DE CONFERENCIA ***', { align: 'center', bold: true, size: 'normal' })
  }
  if (modelo.unidade) pushPilula(content, modelo.unidade, 'codigo', desenharPilula)
  if (modelo.identidade.primaria) {
    pushPilula(
      content,
      modelo.identidade.primaria,
      identidadePrimariaEhTipoAvulso(modelo.identidade.primaria) ? 'identidade' : 'codigo',
      desenharPilula
    )
  }
  if (modelo.identidade.secundaria) {
    pushPilula(content, modelo.identidade.secundaria, 'identidade', desenharPilula)
  }
  for (const item of modelo.itens) {
    pushTexto(content, item.produto, { align: 'left', bold: true, size: 'double' })
    item.extras.forEach((extra, i) => {
      content.push({ type: 'text', text: extra, align: 'left', bold: true, size: SIZE_COMPLEMENTO })
      if (i < item.extras.length - 1) {
        content.push({
          type: 'feed',
          dots: dotsEntreModificadoresProducao(extra, item.extras[i + 1] ?? ''),
        })
      }
    })
    pushSeparador(content, desenharSeparador)
  }
  if (modelo.itens.length === 0) pushSeparador(content, desenharSeparador)
  if (modelo.observacaoPedido) {
    pushTexto(content, 'OBSERVACAO DO PEDIDO', { align: 'center', bold: true, size: 'normal' })
    pushTexto(content, modelo.observacaoPedido, {
      align: 'center',
      bold: true,
      size: SIZE_COMPLEMENTO,
    })
    pushSeparador(content, desenharSeparador)
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
    content: modeloToProducaoHibridoContent(
      modelo,
      options?.desenharPilula,
      options?.desenharSeparador
    ),
  }
}
