import { configuracoesTabPath } from '@/src/shared/constants/configuracoesRoutes'

export const EMPRESA_DELIVERY_PENDENCIA_TYPES = {
  EMPRESA_DELIVERY_NAO_CONFIGURADA: 'EMPRESA_DELIVERY_NAO_CONFIGURADA',
  CARDAPIO_DELIVERY_NAO_CONFIGURADO: 'CARDAPIO_DELIVERY_NAO_CONFIGURADO',
  GEOLOCALIZACAO_NAO_CONFIGURADA: 'GEOLOCALIZACAO_NAO_CONFIGURADA',
} as const

export type EmpresaDeliveryPendenciaType =
  (typeof EMPRESA_DELIVERY_PENDENCIA_TYPES)[keyof typeof EMPRESA_DELIVERY_PENDENCIA_TYPES]

export type EmpresaDeliveryPendenciaItem = {
  type: string
  message: string
}

export type PendenciaAcao = {
  label: string
  href: string
}

const ACAO_POR_TIPO: Partial<Record<EmpresaDeliveryPendenciaType, PendenciaAcao>> = {
  [EMPRESA_DELIVERY_PENDENCIA_TYPES.GEOLOCALIZACAO_NAO_CONFIGURADA]: {
    label: 'Configurar na aba Empresa',
    href: `${configuracoesTabPath('empresa')}#geolocalizacao-empresa`,
  },
  [EMPRESA_DELIVERY_PENDENCIA_TYPES.CARDAPIO_DELIVERY_NAO_CONFIGURADO]: {
    label: 'Selecionar cardápio abaixo',
    href: '#empresa-delivery-menu',
  },
}

export function resolverAcaoPendencia(type: string): PendenciaAcao | null {
  return ACAO_POR_TIPO[type as EmpresaDeliveryPendenciaType] ?? null
}

export function lojaDeliveryProntaParaPublico(pendencias: EmpresaDeliveryPendenciaItem[] | undefined): boolean {
  return !pendencias?.length
}
