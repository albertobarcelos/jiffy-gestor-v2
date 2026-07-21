export type DeliveryCheckoutStep =
  | 'telefone'
  | 'enderecos'
  | 'enderecoForm'
  | 'tipoEntrega'
  | 'quando'
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
  | 'horario'
  | 'pagamento'
  | 'revisao'

type CalculateDeliveryCheckoutProgressParams = {
  checkoutStep: DeliveryCheckoutStep
  tipoEntrega: 'entrega' | 'retirada'
  modoTempo: 'imediato' | 'agendado' | ''
  preserveCompleted?: boolean
}

const MAXIMUM_PATH: LogicalCheckoutStep[] = [
  'identificacao',
  'recebimento',
  'endereco',
  'horario',
  'pagamento',
  'revisao',
]

const STEP_TO_LOGICAL_STEP: Record<Exclude<DeliveryCheckoutStep, null>, LogicalCheckoutStep> = {
  telefone: 'identificacao',
  tipoEntrega: 'recebimento',
  enderecos: 'endereco',
  enderecoForm: 'endereco',
  quando: 'horario',
  pagamento: 'pagamento',
  revisao: 'revisao',
}

export function buildDeliveryCheckoutPath(
  tipoEntrega: 'entrega' | 'retirada',
  modoTempo: 'imediato' | 'agendado' | ''
): LogicalCheckoutStep[] {
  if (!modoTempo) return MAXIMUM_PATH

  return [
    'identificacao',
    'recebimento',
    ...(tipoEntrega === 'entrega' ? (['endereco'] as const) : []),
    ...(modoTempo === 'agendado' ? (['horario'] as const) : []),
    'pagamento',
    'revisao',
  ]
}

export function calculateDeliveryCheckoutProgress({
  checkoutStep,
  tipoEntrega,
  modoTempo,
  preserveCompleted = false,
}: CalculateDeliveryCheckoutProgressParams): DeliveryCheckoutProgress | null {
  if (!checkoutStep) return null

  const path = buildDeliveryCheckoutPath(tipoEntrega, modoTempo)
  const logicalStep = STEP_TO_LOGICAL_STEP[checkoutStep]
  const currentIndex = Math.max(path.indexOf(logicalStep), 0)
  const completedIndex =
    preserveCompleted || checkoutStep === 'revisao' ? path.length - 1 : currentIndex
  const totalTransitions = Math.max(path.length - 1, 1)
  const percentage = Math.round((completedIndex / totalTransitions) * 100)

  return {
    step: checkoutStep,
    current: completedIndex + 1,
    total: path.length,
    percentage,
    label:
      percentage === 100
        ? 'Etapas do pedido concluídas'
        : `Etapa ${completedIndex + 1} de ${path.length}`,
  }
}
