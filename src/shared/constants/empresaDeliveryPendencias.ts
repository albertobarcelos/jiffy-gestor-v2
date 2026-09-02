import {
  configuracoesTabPath,
  deliveryHubEtapaPath,
} from '@/src/shared/constants/configuracoesRoutes'

export const EMPRESA_DELIVERY_PENDENCIA_TYPES = {
  EMPRESA_DELIVERY_NAO_CONFIGURADA: 'EMPRESA_DELIVERY_NAO_CONFIGURADA',
  CARDAPIO_DELIVERY_NAO_CONFIGURADO: 'CARDAPIO_DELIVERY_NAO_CONFIGURADO',
  GEOLOCALIZACAO_NAO_CONFIGURADA: 'GEOLOCALIZACAO_NAO_CONFIGURADA',
  COBERTURA_NAO_CONFIGURADA: 'COBERTURA_NAO_CONFIGURADA',
  CANAL_WHATSAPP_NAO_CONECTADO: 'CANAL_WHATSAPP_NAO_CONECTADO',
  FUNCIONAMENTO_AGENDA_NAO_CONFIGURADA: 'FUNCIONAMENTO_AGENDA_NAO_CONFIGURADA',
  TIMEZONE_NAO_CONFIGURADO: 'TIMEZONE_NAO_CONFIGURADO',
} as const

export type EmpresaDeliveryPendenciaType =
  (typeof EMPRESA_DELIVERY_PENDENCIA_TYPES)[keyof typeof EMPRESA_DELIVERY_PENDENCIA_TYPES]

export type EmpresaDeliveryPendenciaItem = {
  type: string
  message: string
  obrigatoria?: boolean
}

export type EmpresaDeliveryDisponibilidadeInput = {
  available?: boolean
  pendencias?: EmpresaDeliveryPendenciaItem[]
}

export type PendenciaAcao = {
  label: string
  href: string
}

const ACAO_POR_TIPO: Partial<Record<EmpresaDeliveryPendenciaType, PendenciaAcao>> = {
  [EMPRESA_DELIVERY_PENDENCIA_TYPES.EMPRESA_DELIVERY_NAO_CONFIGURADA]: {
    label: 'Configurar nome e cardápio',
    href: deliveryHubEtapaPath('delivery-nome-cardapio'),
  },
  [EMPRESA_DELIVERY_PENDENCIA_TYPES.GEOLOCALIZACAO_NAO_CONFIGURADA]: {
    label: 'Configurar na aba Empresa',
    href: `${configuracoesTabPath('empresa')}#geolocalizacao-empresa`,
  },
  [EMPRESA_DELIVERY_PENDENCIA_TYPES.CARDAPIO_DELIVERY_NAO_CONFIGURADO]: {
    label: 'Selecionar cardápio',
    href: deliveryHubEtapaPath('delivery-nome-cardapio'),
  },
  [EMPRESA_DELIVERY_PENDENCIA_TYPES.COBERTURA_NAO_CONFIGURADA]: {
    label: 'Configurar cobertura de entrega',
    href: deliveryHubEtapaPath('delivery-cobertura'),
  },
  [EMPRESA_DELIVERY_PENDENCIA_TYPES.FUNCIONAMENTO_AGENDA_NAO_CONFIGURADA]: {
    label: 'Configurar agenda',
    href: deliveryHubEtapaPath('delivery-agenda'),
  },
  [EMPRESA_DELIVERY_PENDENCIA_TYPES.TIMEZONE_NAO_CONFIGURADO]: {
    label: 'Configurar fuso na aba Empresa',
    href: configuracoesTabPath('empresa'),
  },
}

export function resolverAcaoPendencia(type: string): PendenciaAcao | null {
  return ACAO_POR_TIPO[type as EmpresaDeliveryPendenciaType] ?? null
}

/** Pendência que impede publicação (`obrigatoria !== false`). */
export function pendenciaEhObrigatoria(item: EmpresaDeliveryPendenciaItem): boolean {
  return item.obrigatoria !== false
}

export function filtrarPendenciasObrigatorias(
  pendencias: EmpresaDeliveryPendenciaItem[] | undefined
): EmpresaDeliveryPendenciaItem[] {
  return (pendencias ?? []).filter(pendenciaEhObrigatoria)
}

export function filtrarPendenciasOrientacao(
  pendencias: EmpresaDeliveryPendenciaItem[] | undefined
): EmpresaDeliveryPendenciaItem[] {
  return (pendencias ?? []).filter(item => item.obrigatoria === false)
}

/**
 * Loja pública liberada quando `available === true`.
 * Fallback legado (sem campo): bloqueia se houver pendência obrigatória.
 */
export function lojaDeliveryDisponivel(
  input: EmpresaDeliveryDisponibilidadeInput | undefined
): boolean {
  if (input?.available !== undefined) return input.available
  return filtrarPendenciasObrigatorias(input?.pendencias).length === 0
}

/** @deprecated Preferir `lojaDeliveryDisponivel`. */
export function lojaDeliveryProntaParaPublico(
  pendencias: EmpresaDeliveryPendenciaItem[] | undefined
): boolean {
  return lojaDeliveryDisponivel({ pendencias })
}
