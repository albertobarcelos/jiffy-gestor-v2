/**
 * Paleta dos cards de meio de pagamento no delivery público —
 * alinhada ao Novo Pedido do gestor (`estiloCardMeioPagamento` / `corFormaPagamentoFiscal`).
 */

export type EstiloMeioPagamentoCard = {
  backgroundColor: string
  borderColor: string
  color: string
  labelColor: string
  labelFontWeight?: number
  iconColor: string
}

/** Cartão (crédito, débito e vales). Dinheiro e PIX ficam fora. */
const COR_CARTAO = '#003366'
/** Verde Jiffy — fundo do dinheiro. */
const COR_VERDE_JIFFY = '#00B074'
/** Verde-limão — texto e ícone de crédito/débito/vales. */
const COR_VERDE_LIMA = '#B4DD2B'
const COR_PIX = '#32BCAD'
const COR_FALLBACK = '#14B8A6'

const COR_POR_FORMA_FISCAL: Record<string, string> = {
  dinheiro: COR_VERDE_JIFFY,
  cash: COR_VERDE_JIFFY,
  pix: COR_PIX,
  cartao_credito: COR_CARTAO,
  cartao_de_credito: COR_CARTAO,
  cartao_debito: COR_CARTAO,
  cartao_de_debito: COR_CARTAO,
  vale_alimentacao: COR_CARTAO,
  vale_refeicao: COR_CARTAO,
  vale_presente: COR_CARTAO,
  vale_combustivel: COR_CARTAO,
}

function normalizarChaveFiscal(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
}

function textoContrasteSobreHex(hex: string): '#ffffff' | '#1a1a1a' {
  const n = hex.replace('#', '')
  if (n.length !== 6) return '#ffffff'
  const r = parseInt(n.slice(0, 2), 16)
  const g = parseInt(n.slice(2, 4), 16)
  const b = parseInt(n.slice(4, 6), 16)
  const luminancia = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminancia > 0.62 ? '#1a1a1a' : '#ffffff'
}

function inferirChavePorNome(nome: string): string | null {
  const n = normalizarChaveFiscal(nome).replace(/_/g, ' ')
  if (n.includes('dinheiro') || n.includes('cash')) return 'dinheiro'
  if (n.includes('pix')) return 'pix'
  if (n.includes('credito')) return 'cartao_credito'
  if (n.includes('debito')) return 'cartao_debito'
  if (n.includes('vale alimentacao') || n.includes('alimentacao')) return 'vale_alimentacao'
  if (n.includes('vale refeicao') || n.includes('refeicao')) return 'vale_refeicao'
  if (n.includes('vale presente') || n.includes('presente')) return 'vale_presente'
  if (n.includes('vale combustivel') || n.includes('combustivel')) return 'vale_combustivel'
  return null
}

function montarEstilo(backgroundColor: string): EstiloMeioPagamentoCard {
  const isCartao = backgroundColor === COR_CARTAO
  const contraste = isCartao ? COR_VERDE_LIMA : textoContrasteSobreHex(backgroundColor)
  return {
    backgroundColor,
    borderColor: backgroundColor,
    color: contraste,
    labelColor: contraste,
    labelFontWeight: isCartao ? 600 : undefined,
    iconColor: contraste,
  }
}

/** Estilo visual do card de meio de pagamento (checkout + modal de informações). */
export function obterEstiloMeioPagamentoPublico(meio: {
  nome: string
  formaPagamentoFiscal?: string | null
}): EstiloMeioPagamentoCard {
  const fiscal = normalizarChaveFiscal(meio.formaPagamentoFiscal ?? '')
  if (fiscal && COR_POR_FORMA_FISCAL[fiscal]) {
    return montarEstilo(COR_POR_FORMA_FISCAL[fiscal]!)
  }

  const porNome = inferirChavePorNome(meio.nome)
  if (porNome && COR_POR_FORMA_FISCAL[porNome]) {
    return montarEstilo(COR_POR_FORMA_FISCAL[porNome]!)
  }

  return montarEstilo(COR_FALLBACK)
}
