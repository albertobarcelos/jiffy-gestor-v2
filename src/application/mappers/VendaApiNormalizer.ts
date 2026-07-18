import type { StatusVenda } from '@/src/domain/types/pedido'
import type { OrigemVenda } from '@/src/domain/types/vendaDetalhe'
import type {
  CriarVendaGestorApiResponse,
  ProdutoLancadoApiItem,
  VendaGestorApiResponse,
} from '@/src/application/dto/api/vendaGestorApi'

const STATUS_VENDA: StatusVenda[] = ['ABERTA', 'FINALIZADA', 'PENDENTE_EMISSAO']

export function pickProdutosLancados(venda: VendaGestorApiResponse): ProdutoLancadoApiItem[] {
  const lista = venda.produtosLancados ?? venda.produtos
  return Array.isArray(lista) ? lista : []
}

export function normalizeStatusVenda(venda: VendaGestorApiResponse): StatusVenda {
  const raw = venda.statusVenda
  if (typeof raw === 'string' && STATUS_VENDA.includes(raw as StatusVenda)) {
    return raw as StatusVenda
  }
  if (venda.dataFinalizacao) {
    return 'FINALIZADA'
  }
  return 'ABERTA'
}

const ORIGEM_API_MAP: Record<string, OrigemVenda> = {
  GESTOR: 'GESTOR',
  JIFFY_DELIVERY: 'JIFFY_DELIVERY',
  IFOOD: 'IFOOD',
  DELIVERY_IFOOD: 'IFOOD',
  RAPPI: 'RAPPI',
  DELIVERY_UBER: 'RAPPI',
  OUTROS: 'OUTROS',
}

export function normalizeOrigemApi(raw: string | null | undefined): OrigemVenda | null {
  if (raw == null || String(raw).trim() === '') {
    return null
  }
  const key = String(raw).trim().toUpperCase()
  return ORIGEM_API_MAP[key] ?? 'OUTROS'
}

function tipoVendaNormalizado(tipoVenda?: string | null): string {
  return String(tipoVenda ?? '')
    .trim()
    .toLowerCase()
}

function tipoVendaEhDelivery(tipoVenda?: string | null): boolean {
  const tipo = tipoVendaNormalizado(tipoVenda)
  return tipo === 'entrega' || tipo === 'retirada'
}

function tipoVendaEhBalcao(tipoVenda?: string | null): boolean {
  return tipoVendaNormalizado(tipoVenda) === 'balcao'
}

function rotuloOrigemGestor(tipoVenda?: string | null): string {
  if (tipoVendaEhDelivery(tipoVenda)) return 'Delivery Gestor'
  if (tipoVendaEhBalcao(tipoVenda)) return 'Balcão Gestor'
  return 'Gestor'
}

/** Rótulo de exibição para origem (UI). */
export function rotuloOrigemParaExibicao(
  origem: OrigemVenda | null,
  origemBrutaApi?: string | null,
  tipoVenda?: string | null
): string {
  if (origem === 'JIFFY_DELIVERY') return 'Delivery público'
  if (origem === 'GESTOR') return rotuloOrigemGestor(tipoVenda)
  if (origem === 'IFOOD') return 'iFood'
  if (origem === 'RAPPI') return 'Rappi'
  if (origem === 'OUTROS') return 'Outros'
  if (origemBrutaApi == null || String(origemBrutaApi).trim() === '') {
    return 'PDV'
  }
  const o = String(origemBrutaApi).trim().toUpperCase()
  if (o === 'PDV') return 'PDV'
  if (o === 'JIFFY_DELIVERY') return 'Delivery público'
  if (o === 'GESTOR') return rotuloOrigemGestor(tipoVenda)
  return String(origemBrutaApi).trim()
}

export function normalizeTipoImpactoPreco(raw: unknown): 'aumenta' | 'diminui' | 'nenhum' {
  if (!raw) return 'nenhum'
  const tipo = String(raw).toLowerCase()
  if (tipo === 'aumenta' || tipo === 'increase') return 'aumenta'
  if (tipo === 'diminui' || tipo === 'decrease') return 'diminui'
  return 'nenhum'
}

export function normalizarDescontoAcrescimoPorcentagem(
  tipo: 'fixo' | 'porcentagem' | null | undefined,
  valor: number | null,
  subtotalProduto: number
): number | null {
  if (valor === null || valor === undefined) return null

  if (tipo === 'porcentagem') {
    if (valor < 1 && valor > 0) {
      return valor * 100
    }
    if (subtotalProduto > 0 && valor >= 1 && valor <= subtotalProduto) {
      const taxaDecimal = valor / subtotalProduto
      if (taxaDecimal >= 0.01 && taxaDecimal <= 1) {
        return Math.round(taxaDecimal * 1000) / 10
      }
    }
    return valor
  }

  if (valor > 0 && valor < 1) {
    return Math.round(valor * 1000) / 10
  }

  return valor
}

export function resolveStatusFiscal(
  venda: VendaGestorApiResponse,
  statusFiscalUnificado?: string | null
): string | null {
  const fiscal = venda.fiscal as { status?: string } | null | undefined
  const resumo = venda.resumoFiscal as { status?: string } | null | undefined
  return (
    statusFiscalUnificado ??
    (typeof venda.statusFiscal === 'string' ? venda.statusFiscal : null) ??
    fiscal?.status ??
    resumo?.status ??
    null
  )
}

export function parseCriarVendaGestorApiResponse(resultado: unknown): string | null {
  if (!resultado || typeof resultado !== 'object') return null
  const r = resultado as CriarVendaGestorApiResponse
  const id = r.id ?? r.vendaId ?? r.data?.id ?? r.data?.vendaId
  return id != null ? String(id).trim() || null : null
}

export function getStringField(source: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const v = source[key]
    if (typeof v === 'string' && v.trim()) return v.trim()
    if (typeof v === 'number' && !Number.isNaN(v)) return String(v)
  }
  return undefined
}
