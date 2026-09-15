import { colors } from '@/src/shared/theme/colors'

export type EstiloMeioPagamentoCard = {
  backgroundColor: string
  color: string
  /** Cor do ícone (pode diferir do texto, ex.: PIX/vouchers em branco). */
  iconColor?: string
}

/** Fallback para meios sem cor mapeada. */
const ESTILO_FALLBACK: EstiloMeioPagamentoCard = {
  backgroundColor: '#171717',
  color: '#ffffff',
  iconColor: '#ffffff',
}

/**
 * Cores alinhadas aos cards do Novo Pedido (gestor) + vales pedidos no delivery público.
 * - dinheiro / crédito / débito / pix: mesma paleta visual do gestor
 * - vales: alimentação amarelo, refeição alternate, presente laranja, combustível vermelho (accent2/switch)
 */
const ESTILO_POR_FORMA_FISCAL: Record<string, EstiloMeioPagamentoCard> = {
  dinheiro: { backgroundColor: colors.accent5, color: '#ffffff', iconColor: '#ffffff' },
  cash: { backgroundColor: colors.accent5, color: '#ffffff', iconColor: '#ffffff' },
  pix: {
    backgroundColor: colors.accent1,
    color: '#ffffff',
    iconColor: '#ffffff',
  },
  cartao_credito: { backgroundColor: colors.primary, color: '#ffffff', iconColor: '#ffffff' },
  cartao_de_credito: { backgroundColor: colors.primary, color: '#ffffff', iconColor: '#ffffff' },
  cartao_debito: { backgroundColor: colors.tertiary, color: '#ffffff', iconColor: '#ffffff' },
  cartao_de_debito: { backgroundColor: colors.tertiary, color: '#ffffff', iconColor: '#ffffff' },
  vale_alimentacao: {
    backgroundColor: '#F5C518',
    color: '#ffffff',
    iconColor: '#ffffff',
  },
  vale_refeicao: {
    backgroundColor: colors.alternate,
    color: '#ffffff',
    iconColor: '#ffffff',
  },
  vale_presente: { backgroundColor: '#FF9800', color: '#ffffff', iconColor: '#ffffff' },
  vale_combustivel: {
    backgroundColor: colors.accent2,
    color: '#ffffff',
    iconColor: '#ffffff',
  },
}

function normalizarChaveFiscal(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
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

/** Estilo visual do card de meio de pagamento no checkout delivery público. */
export function obterEstiloMeioPagamentoPublico(meio: {
  nome: string
  formaPagamentoFiscal?: string | null
}): EstiloMeioPagamentoCard {
  const fiscal = normalizarChaveFiscal(meio.formaPagamentoFiscal ?? '')
  if (fiscal && ESTILO_POR_FORMA_FISCAL[fiscal]) {
    return ESTILO_POR_FORMA_FISCAL[fiscal]
  }

  const porNome = inferirChavePorNome(meio.nome)
  if (porNome && ESTILO_POR_FORMA_FISCAL[porNome]) {
    return ESTILO_POR_FORMA_FISCAL[porNome]
  }

  return ESTILO_FALLBACK
}
