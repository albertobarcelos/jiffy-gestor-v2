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
  impressoraExpedicaoId: string | null
}

export interface EmpresaDeliveryDTO {
  id: string
  slug: string
  empresaId: string
  parametroDelivery: ParametroDeliveryDTO
}

export interface CreateEmpresaDeliveryInput {
  slug: string
  parametroDelivery?: Partial<ParametroDeliveryDTO> | null
}

export interface UpdateEmpresaDeliveryInput {
  slug?: string
  parametroDelivery?: Partial<ParametroDeliveryDTO> | null
}
