export type DeliveryCheckoutStep =
  | 'telefone'
  | 'enderecos'
  | 'enderecoForm'
  | 'tipoEntrega'
  | 'pagamento'
  | 'revisao'
  | null

export type DeliveryCheckoutProgress = {
  step: Exclude<DeliveryCheckoutStep, null>
  current: number
  total: number
  percentage: number
  label: string
}

type LogicalCheckoutStep =
  | 'identificacao'
  | 'recebimento'
  | 'endereco'
  | 'pagamento'
  | 'revisao'

export type ClienteLookupStatusForProgress =
  | 'idle'
  | 'loading'
  | 'encontrado'
  | 'nao_encontrado'
  | 'erro'

type CalculateDeliveryCheckoutProgressParams = {
  checkoutStep: DeliveryCheckoutStep
  tipoEntrega: 'entrega' | 'retirada'
  preserveCompleted?: boolean
  /**
   * Identificação concluída na tela de telefone (cliente com nome no cadastro
   * ou nome+sobrenome válidos). Só afeta o passo `telefone`.
   */
  identificacaoCompleta?: boolean
}

/** Path visual do checkout nesta branch (sem etapa de horário/agendamento). */
export function buildDeliveryCheckoutPath(
  tipoEntrega: 'entrega' | 'retirada'
): LogicalCheckoutStep[] {
  return [
    'identificacao',
    'recebimento',
    ...(tipoEntrega === 'entrega' ? (['endereco'] as const) : []),
    'pagamento',
    'revisao',
  ]
}

const STEP_TO_LOGICAL_STEP: Record<Exclude<DeliveryCheckoutStep, null>, LogicalCheckoutStep> = {
  telefone: 'identificacao',
  tipoEntrega: 'recebimento',
  enderecos: 'endereco',
  enderecoForm: 'endereco',
  pagamento: 'pagamento',
  revisao: 'revisao',
}

/** Nome + sobrenome: ao menos 3 chars e duas palavras separadas por espaço. */
export function isNomeCompletoCheckoutValido(nome: string): boolean {
  const trimmed = nome.trim()
  return trimmed.length >= 3 && trimmed.includes(' ')
}

/**
 * Passo de identificação concluído (ainda na tela Identifique-se ou já avançado).
 * - Cliente encontrado com nome no cadastro → completo
 * - Cliente encontrado sem nome / não encontrado → exige nome+sobrenome válidos
 */
export function isIdentificacaoCheckoutCompleta(params: {
  lookupStatus: ClienteLookupStatusForProgress
  nomeCadastro: string | null | undefined
  nomeDigitado: string
}): boolean {
  const { lookupStatus, nomeCadastro, nomeDigitado } = params
  const temNomeNoCadastro = Boolean(nomeCadastro?.trim())

  if (lookupStatus === 'encontrado' && temNomeNoCadastro) {
    return true
  }

  if (lookupStatus === 'encontrado' || lookupStatus === 'nao_encontrado') {
    return isNomeCompletoCheckoutValido(nomeDigitado)
  }

  return false
}

export function calculateDeliveryCheckoutProgress({
  checkoutStep,
  tipoEntrega,
  preserveCompleted = false,
  identificacaoCompleta = false,
}: CalculateDeliveryCheckoutProgressParams): DeliveryCheckoutProgress | null {
  if (!checkoutStep) return null

  const path = buildDeliveryCheckoutPath(tipoEntrega)
  const logicalStep = STEP_TO_LOGICAL_STEP[checkoutStep]
  const currentIndex = Math.max(path.indexOf(logicalStep), 0)
  const totalTransitions = Math.max(path.length - 1, 1)

  let completedIndex: number
  if (preserveCompleted || checkoutStep === 'revisao') {
    completedIndex = path.length - 1
  } else if (checkoutStep === 'telefone') {
    // Ainda na identificação: barra só sobe quando o passo está completo.
    completedIndex = identificacaoCompleta ? 1 : 0
  } else {
    completedIndex = currentIndex
  }

  const percentage = Math.round((completedIndex / totalTransitions) * 100)

  return {
    step: checkoutStep,
    current: Math.min(completedIndex + 1, path.length),
    total: path.length,
    percentage,
    label:
      percentage === 100
        ? 'Etapas do pedido concluídas'
        : `Etapa ${Math.min(completedIndex + 1, path.length)} de ${path.length}`,
  }
}
