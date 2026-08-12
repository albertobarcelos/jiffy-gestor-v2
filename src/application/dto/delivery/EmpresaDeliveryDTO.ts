export interface ParametroDeliveryDTO {
  modoImpressaoDelivery: string
  copiasCupomUnificado: number
  imprimirAoReceber: boolean
  imprimirAoFicarPronto: boolean
  autoIniciarPreparoNovosPedidos: boolean
  timezone?: string
  aceitaAgendamento?: boolean
  intervaloSlotMinutos?: 15 | 30
  leadTimeMinutos?: number
  diasAntecedenciaMax?: number
  maxPedidosPorSlot?: number | null
  impressoraExpedicaoId: string | null
}

export interface EmpresaDeliveryDTO {
  id: string
  slug: string
  empresaId: string
  /** Nome de vitrine do cardápio. Null/undefined = usar nome fantasia da empresa. */
  nomeExibicao?: string | null
  parametroDelivery: ParametroDeliveryDTO
}

export interface CreateEmpresaDeliveryInput {
  slug: string
  nomeExibicao?: string | null
  parametroDelivery?: Partial<ParametroDeliveryDTO> | null
}

export interface UpdateEmpresaDeliveryInput {
  slug?: string
  nomeExibicao?: string | null
  parametroDelivery?: Partial<ParametroDeliveryDTO> | null
}
