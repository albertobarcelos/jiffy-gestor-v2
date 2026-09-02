export interface ParametroDeliveryDTO {
  modoImpressaoDelivery: string
  copiasCupomUnificado: number
  imprimirAoReceber: boolean
  imprimirAoFicarPronto: boolean
  autoIniciarPreparoNovosPedidos: boolean
  impressoraExpedicaoId: string | null
  menuDeliveryId?: string | null
}

export interface EmpresaDeliveryPendenciaDTO {
  type: string
  message: string
  /** `false` = orientação ao técnico; não bloqueia a loja pública. */
  obrigatoria?: boolean
}

export interface EmpresaDeliveryDTO {
  id: string
  slug: string
  empresaId: string
  parametroDelivery: ParametroDeliveryDTO
  /** `false` quando há pendência obrigatória; orientações não afetam este campo. */
  available?: boolean
  pendencias?: EmpresaDeliveryPendenciaDTO[]
}

export interface CreateEmpresaDeliveryInput {
  slug: string
  parametroDelivery?: Partial<ParametroDeliveryDTO> | null
}

export interface UpdateEmpresaDeliveryInput {
  slug?: string
  parametroDelivery?: Partial<ParametroDeliveryDTO> | null
}
