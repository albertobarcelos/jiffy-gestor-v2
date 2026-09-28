import { renderDeliveryCupomHtml, larguraCupomDeliveryPx } from '@/src/application/delivery/renderDeliveryCupomHtml'
import { columnsFromCupomTemplate, mergeCupomTemplate } from '@/src/application/delivery/cupomPrintLayout'
import { textoEscPosProducao, textosIdentidadeProducao } from '@/src/application/delivery/layoutProducao80mm'
import {
  graphicRasterScale,
  rasterizeCupomHtmlToPngBase64,
} from '@/src/infrastructure/printing/rasterizeCupomHtml'
import type { DesenharMolduraIdentidade } from '@/src/application/ports/IDesenharPilulaProducao'
import type { PrintContentBlock, PrintDocument } from '@/src/application/ports/printDocument'
import type { DeliveryCupomTemplateConfig } from '@/src/shared/types/deliveryCupomTemplate'
import type { VendaGestorTicket, VendaGestorTicketsResponse } from '@/src/shared/types/vendaGestorTickets'

/**
 * Folga depois do rodapé no cupom gráfico. O corte GS V 65 já avança até a faca;
 * 8 linhas somavam ~34 mm em branco. 2 linhas ≈ 8 mm — só para não cortar o texto.
 */
export const LINHAS_ANTES_DO_CORTE_GRAFICO = 2

export function headerEmpresaEscPos(empresa: string): PrintContentBlock[] {
  const texto = textoEscPosProducao(empresa)
  if (!texto) return []
  return [{ type: 'text', text: texto, align: 'center', bold: true, size: 'normal' }]
}

export function headerIdentidadeEscPos(identidade: string): PrintContentBlock[] {
  const texto = textoEscPosProducao(identidade)
  if (!texto) return []
  return [{ type: 'text', text: texto, align: 'center', bold: true, size: 'double' }]
}

export function headerIdentidadeComContorno(
  identidade: string,
  desenharMoldura?: DesenharMolduraIdentidade
): PrintContentBlock[] {
  const texto = headerIdentidadeEscPos(identidade)
  if (texto.length === 0) return []
  const topo = desenharMoldura?.('topo')
  const base = desenharMoldura?.('base')
  return [
    ...(topo ? [{ type: 'image' as const, data: topo, align: 'center' as const }] : []),
    ...texto,
    ...(base ? [{ type: 'image' as const, data: base, align: 'center' as const }] : []),
  ]
}

export function identidadeCabecalhoGrafico(root: VendaGestorTicketsResponse): string {
  return textosIdentidadeProducao({
    tipoVenda: root.tipoVenda,
    tipoEntrega: root.tipoEntrega,
    codigoVenda: root.codigoVenda || root.rastreamento?.codigoVenda,
    numeroVenda: root.numeroVenda,
  }).primaria
}

export function buildGraphicPrintDocument(
  pngBase64: string,
  columns: number,
  header: PrintContentBlock[] = []
): PrintDocument {
  return {
    type: 'ORDER',
    columns,
    content: [
      ...header,
      { type: 'image', data: pngBase64, align: 'center' },
      { type: 'feed', lines: LINHAS_ANTES_DO_CORTE_GRAFICO },
      { type: 'cut' },
    ],
  }
}

function nomeEmpresaGrafico(
  root: VendaGestorTicketsResponse,
  fallback?: string
): string {
  return (
    root.empresa?.nomeExibicao?.trim() ||
    root.empresa?.nome?.trim() ||
    root.empresa?.razaoSocial?.trim() ||
    fallback?.trim() ||
    ''
  )
}

export async function mapTicketToGraphicPrintDocument(
  root: VendaGestorTicketsResponse,
  ticket: VendaGestorTicket,
  options?: {
    nomeEmpresa?: string
    template?: DeliveryCupomTemplateConfig
    desenharMolduraIdentidade?: DesenharMolduraIdentidade
  }
): Promise<PrintDocument> {
  const template = mergeCupomTemplate(options?.template)
  const empresa = template.mostrarLogoTexto
    ? nomeEmpresaGrafico(root, options?.nomeEmpresa)
    : ''
  const identidade = identidadeCabecalhoGrafico(root)
  const html = renderDeliveryCupomHtml({
    root,
    ticket,
    nomeEmpresa: options?.nomeEmpresa,
    template,
    omitirNomeEmpresa: Boolean(empresa),
    omitirIdentidade: Boolean(identidade),
  })
  const widthPx = larguraCupomDeliveryPx(template.larguraMm)
  const png = await rasterizeCupomHtmlToPngBase64(html, {
    widthPx,
    scale: graphicRasterScale(template.larguraMm),
  })
  return buildGraphicPrintDocument(png, columnsFromCupomTemplate(template), [
    ...headerEmpresaEscPos(empresa),
    ...headerIdentidadeComContorno(identidade, options?.desenharMolduraIdentidade),
  ])
}
