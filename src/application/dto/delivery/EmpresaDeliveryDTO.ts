export interface ParametroDeliveryDTO {
  modoImpressaoDelivery: string
  copiasCupomUnificado: number
  imprimirAoReceber: boolean
  imprimirAoFicarPronto: boolean
  autoIniciarPreparoNovosPedidos: boolean
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
