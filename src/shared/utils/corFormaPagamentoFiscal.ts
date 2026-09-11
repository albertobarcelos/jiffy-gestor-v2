/**
 * Cor por forma de pagamento fiscal (cadastro — campo estável; o nome do meio pode ser “dindin”).
 * Chaves como em NovoMeioPagamento / API (minúsculas, snake_case).
 */
/** Cartão (crédito, débito e vales). Dinheiro e PIX ficam fora. */
const COR_CARTAO = '#003366'
/** Verde Jiffy (accent5) — fundo do dinheiro. */
const COR_VERDE_JIFFY = '#00B074'
/** Verde-limão da paleta (accent1) — texto e ícone de todo cartão (crédito, débito e vales). */
const COR_VERDE_LIMA = '#B4DD2B'

const COR_POR_FORMA_PAGAMENTO_FISCAL: Record<string, string> = {
  dinheiro: COR_VERDE_JIFFY,
  pix: '#32BCAD',
  cartao_credito: COR_CARTAO,
  cartao_debito: COR_CARTAO,
  vale_alimentacao: COR_CARTAO,
  vale_refeicao: COR_CARTAO,
  vale_presente: COR_CARTAO,
  vale_combustivel: COR_CARTAO,
}

const ALIAS_FORMA_PAGAMENTO_FISCAL: Record<string, keyof typeof COR_POR_FORMA_PAGAMENTO_FISCAL> = {
  cartao_de_credito: 'cartao_credito',
  cartao_de_debito: 'cartao_debito',
}

const COR_FORMA_FISCAL_FALLBACK = '#14B8A6'

export function normalizarChaveFormaPagamentoFiscal(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
}

export function corFormaPagamentoFiscal(formaRaw: string): string {
  const chave = normalizarChaveFormaPagamentoFiscal(formaRaw)
  if (!chave) return COR_FORMA_FISCAL_FALLBACK
  const direto = COR_POR_FORMA_PAGAMENTO_FISCAL[chave]
  if (direto) return direto
  const viaAlias = ALIAS_FORMA_PAGAMENTO_FISCAL[chave]
  if (viaAlias) return COR_POR_FORMA_PAGAMENTO_FISCAL[viaAlias]
  return COR_FORMA_FISCAL_FALLBACK
}

/** Texto legível sobre o fundo da forma. */
export function textoContrasteSobreHex(hex: string): '#ffffff' | '#1a1a1a' {
  const n = hex.replace('#', '')
  if (n.length !== 6) return '#ffffff'
  const r = parseInt(n.slice(0, 2), 16)
  const g = parseInt(n.slice(2, 4), 16)
  const b = parseInt(n.slice(4, 6), 16)
  const luminancia = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminancia > 0.62 ? '#1a1a1a' : '#ffffff'
}

export function estiloCardMeioPagamento(formaFiscal: string): {
  backgroundColor: string
  borderColor: string
  color: string
  labelColor: string
  labelFontWeight?: number
} {
  const backgroundColor = corFormaPagamentoFiscal(formaFiscal)
  const isCartao = backgroundColor === COR_CARTAO
  const contraste = isCartao ? COR_VERDE_LIMA : textoContrasteSobreHex(backgroundColor)
  return {
    backgroundColor,
    borderColor: backgroundColor,
    color: contraste,
    labelColor: contraste,
    labelFontWeight: isCartao ? 600 : undefined,
  }
}

/** Variáveis CSS para o chip lançado: mesma cor, mais clara; hover volta à cor cheia. */
export function varsCardMeioPagamentoLancado(formaFiscal: string): Record<string, string> {
  const cor = corFormaPagamentoFiscal(formaFiscal)
  return {
    '--meio-cor': cor,
    '--meio-texto-forte': textoContrasteSobreHex(cor),
  }
}

export function ehFormaPagamentoDinheiro(formaFiscal: string, nome = ''): boolean {
  const fiscal = normalizarChaveFormaPagamentoFiscal(formaFiscal)
  if (fiscal === 'dinheiro') return true
  const nomeNorm = normalizarChaveFormaPagamentoFiscal(nome)
  return nomeNorm.includes('dinheiro') || nomeNorm.includes('cash')
}

function nomeNormalizado(nome: string): string {
  return normalizarChaveFormaPagamentoFiscal(nome).replace(/_/g, ' ')
}

function ehFormaPagamentoCredito(formaFiscal: string, nome = ''): boolean {
  const fiscal = normalizarChaveFormaPagamentoFiscal(formaFiscal)
  if (fiscal === 'cartao_credito' || fiscal === 'cartao_de_credito') return true
  const n = nomeNormalizado(nome)
  return /\bcredito\b|\bcredit\b/.test(n) && !/\bdebito\b|\bdebit\b/.test(n)
}

function ehFormaPagamentoDebito(formaFiscal: string, nome = ''): boolean {
  const fiscal = normalizarChaveFormaPagamentoFiscal(formaFiscal)
  if (fiscal === 'cartao_debito' || fiscal === 'cartao_de_debito') return true
  const n = nomeNormalizado(nome)
  return /\bdebito\b|\bdebit\b/.test(n)
}

function ehFormaPagamentoPix(formaFiscal: string, nome = ''): boolean {
  const fiscal = normalizarChaveFormaPagamentoFiscal(formaFiscal)
  if (fiscal === 'pix') return true
  return /\bpix\b/.test(nomeNormalizado(nome))
}

/** Dinheiro → Crédito → Débito → Pix; o restante mantém a ordem original. */
const RANK_ORDEM_PADRAO: Record<string, number> = {
  dinheiro: 0,
  cartao_credito: 1,
  cartao_debito: 2,
  pix: 3,
}

function chaveOrdemPadraoMeio(formaFiscal: string, nome: string): string | null {
  if (ehFormaPagamentoDinheiro(formaFiscal, nome)) return 'dinheiro'
  if (ehFormaPagamentoCredito(formaFiscal, nome)) return 'cartao_credito'
  if (ehFormaPagamentoDebito(formaFiscal, nome)) return 'cartao_debito'
  if (ehFormaPagamentoPix(formaFiscal, nome)) return 'pix'
  return null
}

function rankOrdemPadraoMeio(formaFiscal: string, nome: string): number {
  const chave = chaveOrdemPadraoMeio(formaFiscal, nome)
  if (chave && chave in RANK_ORDEM_PADRAO) return RANK_ORDEM_PADRAO[chave]
  return 100
}

export function ordenarMeiosPagamentoPadrao<
  T extends { getFormaPagamentoFiscal(): string; getNome(): string },
>(meios: T[]): T[] {
  return meios
    .map((meio, indiceOriginal) => ({ meio, indiceOriginal }))
    .sort((a, b) => {
      const ra = rankOrdemPadraoMeio(a.meio.getFormaPagamentoFiscal(), a.meio.getNome())
      const rb = rankOrdemPadraoMeio(b.meio.getFormaPagamentoFiscal(), b.meio.getNome())
      if (ra !== rb) return ra - rb
      return a.indiceOriginal - b.indiceOriginal
    })
    .map(item => item.meio)
}

/** @deprecated Use ordenarMeiosPagamentoPadrao */
export function ordenarMeiosPagamentoDinheiroPrimeiro<
  T extends { getFormaPagamentoFiscal(): string; getNome(): string },
>(meios: T[]): T[] {
  return ordenarMeiosPagamentoPadrao(meios)
}
