import type { DeliveryCupomTemplateConfig } from '@/src/shared/types/deliveryCupomTemplate'
import { DEFAULT_DELIVERY_CUPOM_TEMPLATE } from '@/src/shared/types/deliveryCupomTemplate'
import type { TicketTipoCupomApi } from '@/src/shared/types/vendaGestorTickets'
import type { PrintSize } from '@/src/infrastructure/printing/agent/printJobTypes'

export function mergeCupomTemplate(
  template?: DeliveryCupomTemplateConfig
): DeliveryCupomTemplateConfig {
  return { ...DEFAULT_DELIVERY_CUPOM_TEMPLATE, ...template }
}

export function columnsFromCupomTemplate(template: DeliveryCupomTemplateConfig): number {
  const base = template.larguraMm === 58 ? 32 : 48
  const colPerMm = base / template.larguraMm
  const trim = Math.round((template.margemLateralMm ?? 0) * colPerMm * 2)
  return Math.max(24, base - trim)
}

export function printSizeFromFontePx(px: number): PrintSize {
  if (px >= 16) return 'double'
  if (px <= 10) return 'small'
  return 'normal'
}

export function sectionFeedLines(densidade: DeliveryCupomTemplateConfig['densidade']): number {
  if (densidade === 'espacoso') return 2
  if (densidade === 'compacto') return 0
  return 1
}

export function qrModuleSizeForWidth(larguraMm: number): number {
  return larguraMm === 58 ? 3 : 4
}

function fonteBloco(v: number | null | undefined, fallback: number): number {
  return Math.min(18, Math.max(8, Math.floor(v ?? fallback)))
}

export type CupomPrintFontes = {
  cabecalho: PrintSize
  pedido: PrintSize
  cliente: PrintSize
  itens: PrintSize
  resumo: PrintSize
  pagamento: PrintSize
  rodape: PrintSize
}

export type CupomPrintNegrito = {
  cabecalho: boolean
  pedido: boolean
  cliente: boolean
  itens: boolean
  resumo: boolean
  pagamento: boolean
  rodape: boolean
}

export function cupomPrintFontes(
  template: DeliveryCupomTemplateConfig,
  tipoCupom: TicketTipoCupomApi
): CupomPrintFontes {
  const modelo = tipoCupom === 'producao' ? 'producao' : 'expedicao'
  const fontesModelo =
    template.fontesPorModelo?.[modelo] ?? DEFAULT_DELIVERY_CUPOM_TEMPLATE.fontesPorModelo[modelo]
  const base = template.tamanhoFonteBase
  return {
    cabecalho: printSizeFromFontePx(
      fonteBloco(fontesModelo.tamanhoFonteCabecalho ?? template.tamanhoFonteCabecalho, base)
    ),
    pedido: printSizeFromFontePx(
      fonteBloco(fontesModelo.tamanhoFontePedido ?? template.tamanhoFontePedido, base)
    ),
    cliente: printSizeFromFontePx(
      fonteBloco(
        fontesModelo.tamanhoFonteClienteEndereco ?? template.tamanhoFonteClienteEndereco,
        base
      )
    ),
    itens: printSizeFromFontePx(
      fonteBloco(fontesModelo.tamanhoFonteItens ?? template.tamanhoFonteItens, base)
    ),
    resumo: printSizeFromFontePx(
      fonteBloco(fontesModelo.tamanhoFonteResumo ?? template.tamanhoFonteResumo, base)
    ),
    pagamento: printSizeFromFontePx(
      fonteBloco(fontesModelo.tamanhoFontePagamento ?? template.tamanhoFontePagamento, base)
    ),
    rodape: printSizeFromFontePx(
      fonteBloco(fontesModelo.tamanhoFonteRodape ?? template.tamanhoFonteRodape, Math.max(8, base - 2))
    ),
  }
}

export function cupomPrintNegrito(
  template: DeliveryCupomTemplateConfig,
  tipoCupom: TicketTipoCupomApi
): CupomPrintNegrito {
  const modelo = tipoCupom === 'producao' ? 'producao' : 'expedicao'
  const fontesModelo =
    template.fontesPorModelo?.[modelo] ?? DEFAULT_DELIVERY_CUPOM_TEMPLATE.fontesPorModelo[modelo]
  const d = DEFAULT_DELIVERY_CUPOM_TEMPLATE
  return {
    cabecalho: fontesModelo.negritoCabecalho ?? d.negritoCabecalho,
    pedido: fontesModelo.negritoPedido ?? d.negritoPedido,
    cliente: fontesModelo.negritoClienteEndereco ?? d.negritoClienteEndereco,
    itens: fontesModelo.negritoItens ?? d.negritoItens,
    resumo: fontesModelo.negritoResumo ?? d.negritoResumo,
    pagamento: fontesModelo.negritoPagamento ?? d.negritoPagamento,
    rodape: fontesModelo.negritoRodape ?? d.negritoRodape,
  }
}

export function telefoneWhatsappE164(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('55')) return digits
  if (digits.length === 10 || digits.length === 11) return `55${digits}`
  return digits
}
