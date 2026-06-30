import {
  DEFAULT_DELIVERY_CUPOM_TEMPLATE,
  DELIVERY_CUPOM_MARGEM_LATERAL_MAX_MM,
  type DeliveryCupomDensidade,
  type DeliveryCupomLargura,
  type DeliveryCupomModeloFonteConfig,
  type DeliveryCupomTemplateConfig,
} from '@/src/shared/types/deliveryCupomTemplate'

function bool(v: unknown, fallback: boolean): boolean {
  if (typeof v === 'boolean') return v
  if (v === 'true' || v === '1') return true
  if (v === 'false' || v === '0') return false
  return fallback
}

function num(v: unknown, fallback: number, min: number, max: number): number {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.floor(n)))
}

function numOrNull(v: unknown, min: number, max: number): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return null
  return Math.min(max, Math.max(min, Math.floor(n)))
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

function largura(v: unknown): DeliveryCupomLargura {
  return Number(v) === 58 ? 58 : 80
}

function densidade(v: unknown): DeliveryCupomDensidade {
  return v === 'compacto' || v === 'espacoso' ? v : 'normal'
}

function parseFontesModelo(raw: unknown): DeliveryCupomModeloFonteConfig {
  const o = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  return {
    tamanhoFonteCabecalho: numOrNull(o.tamanhoFonteCabecalho, 8, 18),
    tamanhoFontePedido: numOrNull(o.tamanhoFontePedido, 8, 18),
    tamanhoFonteClienteEndereco: numOrNull(o.tamanhoFonteClienteEndereco, 8, 18),
    tamanhoFonteItens: numOrNull(o.tamanhoFonteItens, 8, 18),
    tamanhoFonteResumo: numOrNull(o.tamanhoFonteResumo, 8, 18),
    tamanhoFontePagamento: numOrNull(o.tamanhoFontePagamento, 8, 18),
    tamanhoFonteRodape: numOrNull(o.tamanhoFonteRodape, 8, 18),
  }
}

/**
 * Preferimos `parametroEmpresa.cupomDeliveryTemplate`, mas aceitamos aliases para evolução do backend.
 */
export function parseDeliveryCupomTemplate(data: Record<string, unknown>): DeliveryCupomTemplateConfig {
  const param = (data.parametroEmpresa ?? data.parametro_empresa) as Record<string, unknown> | undefined
  const raw =
    param?.cupomDeliveryTemplate ??
    param?.modeloCupomDelivery ??
    data.cupomDeliveryTemplate ??
    data.modeloCupomDelivery

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return DEFAULT_DELIVERY_CUPOM_TEMPLATE
  }

  const o = raw as Record<string, unknown>
  const d = DEFAULT_DELIVERY_CUPOM_TEMPLATE
  const fontesPorModelo =
    o.fontesPorModelo && typeof o.fontesPorModelo === 'object' && !Array.isArray(o.fontesPorModelo)
      ? (o.fontesPorModelo as Record<string, unknown>)
      : {}

  return {
    larguraMm: largura(o.larguraMm),
    margemLateralMm: num(o.margemLateralMm, d.margemLateralMm, 0, DELIVERY_CUPOM_MARGEM_LATERAL_MAX_MM),
    densidade: densidade(o.densidade),
    tamanhoFonteBase: num(o.tamanhoFonteBase, d.tamanhoFonteBase, 10, 18),
    tamanhoFonteCabecalho: numOrNull(o.tamanhoFonteCabecalho, 8, 18),
    tamanhoFontePedido: numOrNull(o.tamanhoFontePedido, 8, 18),
    tamanhoFonteClienteEndereco: numOrNull(o.tamanhoFonteClienteEndereco, 8, 18),
    tamanhoFonteItens: numOrNull(o.tamanhoFonteItens, 8, 18),
    tamanhoFonteResumo: numOrNull(o.tamanhoFonteResumo, 8, 18),
    tamanhoFontePagamento: numOrNull(o.tamanhoFontePagamento, 8, 18),
    tamanhoFonteRodape: numOrNull(o.tamanhoFonteRodape, 8, 18),
    fontesPorModelo: {
      producao: parseFontesModelo(fontesPorModelo.producao),
      expedicao: parseFontesModelo(fontesPorModelo.expedicao),
    },
    destacarProdutos: bool(o.destacarProdutos, d.destacarProdutos),
    mostrarLogoTexto: bool(o.mostrarLogoTexto, d.mostrarLogoTexto),
    mostrarTelefoneCliente: bool(o.mostrarTelefoneCliente, d.mostrarTelefoneCliente),
    mostrarEnderecoEntrega: bool(o.mostrarEnderecoEntrega, d.mostrarEnderecoEntrega),
    mostrarValores: bool(o.mostrarValores, d.mostrarValores),
    mostrarObservacaoPedido: bool(o.mostrarObservacaoPedido, d.mostrarObservacaoPedido),
    mostrarDataHora: bool(o.mostrarDataHora, d.mostrarDataHora),
    cabecalhoExtra: str(o.cabecalhoExtra).slice(0, 500),
    rodapeExtra: str(o.rodapeExtra).slice(0, 500),
  }
}

