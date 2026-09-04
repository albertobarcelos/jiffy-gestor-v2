export interface ParametroDeliveryDTO {
  modoImpressaoDelivery: string
  copiasCupomUnificado: number
  imprimirAoReceber: boolean
  imprimirAoFicarPronto: boolean
  autoIniciarPreparoNovosPedidos: boolean
  impressoraExpedicaoId: string | null
  /** Presente na API; UI de Menus não entra nesta branch. */
  menuDeliveryId?: string | null
}

export interface EmpresaDeliveryPendenciaDTO {
  type: string
  message: string
  /** `false` = orientação ao técnico; não bloqueia. */
  obrigatoria?: boolean
}

export interface EmpresaDeliveryDTO {
  id: string
  slug: string
  empresaId: string
  parametroDelivery: ParametroDeliveryDTO
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
