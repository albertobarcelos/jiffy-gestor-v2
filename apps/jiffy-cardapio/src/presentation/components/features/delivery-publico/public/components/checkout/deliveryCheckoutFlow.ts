import type { DeliveryCheckoutStep } from './deliveryCheckoutProgress'

export type OrigemFormEnderecoCheckout =
  | 'geo'
  | 'lista'
  | 'novo'
  | 'identificacao'
  | null

export type EnderecoFlowSnapshot = {
  id: string
  temGeolocalizacao: boolean
}

const STEP_ORDER: Exclude<DeliveryCheckoutStep, null>[] = [
  'telefone',
  'enderecos',
  'enderecoForm',
  'enderecoGeo',
  'pagamento',
  'revisao',
  'sucesso',
  'pedidoDetalhe',
]

export function calcularDirecaoSlide(
  from: DeliveryCheckoutStep,
  to: DeliveryCheckoutStep
): 1 | -1 {
  if (!from || !to) return 1
  const a = STEP_ORDER.indexOf(from)
  const b = STEP_ORDER.indexOf(to)
  if (a < 0 || b < 0) return 1
  return b >= a ? 1 : -1
}

/**
 * Guards / resolução de próximo step — puro, testável (Fase C).
 * A UI só aplica o resultado (goTo / flags).
 */

export function entregaExigeEndereco(
  tipoEntrega: 'entrega' | 'retirada',
  enderecoSelecionado: EnderecoFlowSnapshot | null
): boolean {
  return tipoEntrega === 'entrega' && !enderecoSelecionado
}

export function entregaExigeGeo(
  tipoEntrega: 'entrega' | 'retirada',
  enderecoSelecionado: EnderecoFlowSnapshot | null
): boolean {
  return (
    tipoEntrega === 'entrega' &&
    Boolean(enderecoSelecionado) &&
    !enderecoSelecionado!.temGeolocalizacao
  )
}

export type AvancarAposIdentificacaoResult =
  | { action: 'abrir_fluxo_endereco' }
  | { action: 'go'; step: 'enderecoGeo' }
  | { action: 'go'; step: 'revisao' }
  | { action: 'pagamento_com_cotacao' }

export function resolverAvancarAposIdentificacao(params: {
  tipoEntrega: 'entrega' | 'retirada'
  enderecoSelecionado: EnderecoFlowSnapshot | null
  voltarParaRevisao: boolean
}): AvancarAposIdentificacaoResult {
  const { tipoEntrega, enderecoSelecionado, voltarParaRevisao } = params
  if (entregaExigeEndereco(tipoEntrega, enderecoSelecionado)) {
    return { action: 'abrir_fluxo_endereco' }
  }
  if (entregaExigeGeo(tipoEntrega, enderecoSelecionado)) {
    return { action: 'go', step: 'enderecoGeo' }
  }
  if (voltarParaRevisao) {
    return { action: 'go', step: 'revisao' }
  }
  return { action: 'pagamento_com_cotacao' }
}

export type SelecionarEnderecoResult =
  | { action: 'go'; step: 'enderecoGeo' }
  | { action: 'proximo_apos_endereco' }

export function resolverSelecionarEndereco(
  endereco: EnderecoFlowSnapshot | null | undefined
): SelecionarEnderecoResult {
  if (endereco && !endereco.temGeolocalizacao) {
    return { action: 'go', step: 'enderecoGeo' }
  }
  return { action: 'proximo_apos_endereco' }
}

export type AbrirFluxoEnderecoResult =
  | { action: 'go'; step: 'enderecos' }
  | { action: 'novo_form'; origem: OrigemFormEnderecoCheckout }
  | { action: 'bloqueado' }

export function resolverAbrirFluxoEndereco(params: {
  quantidadeEnderecos: number
  podeCriarNovo: boolean
}): AbrirFluxoEnderecoResult {
  if (params.quantidadeEnderecos > 0) {
    return { action: 'go', step: 'enderecos' }
  }
  if (!params.podeCriarNovo) return { action: 'bloqueado' }
  return { action: 'novo_form', origem: 'novo' }
}

export type TrocarEnderecoResult =
  | { action: 'go'; step: 'enderecos' }
  | { action: 'novo_form'; origem: OrigemFormEnderecoCheckout }
  | { action: 'bloqueado' }

export function resolverTrocarEndereco(params: {
  quantidadeEnderecos: number
  podeCriarNovo: boolean
  origem: 'identificacao' | 'revisao'
}): TrocarEnderecoResult {
  if (params.quantidadeEnderecos > 0) {
    return { action: 'go', step: 'enderecos' }
  }
  if (!params.podeCriarNovo) return { action: 'bloqueado' }
  return {
    action: 'novo_form',
    origem: params.origem === 'identificacao' ? 'identificacao' : 'novo',
  }
}

export type ProximoAposEnderecoResult =
  | { action: 'go'; step: 'revisao' | 'telefone' | 'pagamento' }
  | { action: 'cotar_e_pagamento' }

export function resolverProximoAposEndereco(params: {
  voltarParaRevisao: boolean
  voltarParaIdentificacao: boolean
  cotacaoValidaParaPagamento: boolean
}): ProximoAposEnderecoResult {
  if (params.voltarParaRevisao) return { action: 'go', step: 'revisao' }
  if (params.voltarParaIdentificacao) return { action: 'go', step: 'telefone' }
  if (params.cotacaoValidaParaPagamento) return { action: 'go', step: 'pagamento' }
  return { action: 'cotar_e_pagamento' }
}

export type CancelarEnderecoFormResult = {
  step: Exclude<DeliveryCheckoutStep, null>
  limparVoltarIdentificacao?: boolean
  limparOrigem: boolean
}

export function resolverCancelarEnderecoForm(params: {
  origemFormEndereco: OrigemFormEnderecoCheckout
  restauradoOuSelecionado: boolean
  voltarParaIdentificacao: boolean
  voltarParaRevisao: boolean
  quantidadeEnderecos: number
}): CancelarEnderecoFormResult {
  const {
    origemFormEndereco,
    restauradoOuSelecionado,
    voltarParaIdentificacao,
    voltarParaRevisao,
    quantidadeEnderecos,
  } = params

  if (origemFormEndereco === 'geo' && restauradoOuSelecionado) {
    return { step: 'enderecoGeo', limparOrigem: true }
  }

  if (origemFormEndereco === 'identificacao' || voltarParaIdentificacao) {
    return { step: 'telefone', limparVoltarIdentificacao: true, limparOrigem: true }
  }

  if (voltarParaRevisao) {
    return { step: 'revisao', limparOrigem: true }
  }

  if (quantidadeEnderecos > 0) {
    return { step: 'enderecos', limparOrigem: true }
  }

  return { step: 'telefone', limparOrigem: true }
}

export type FecharOuRevisaoResult =
  | { action: 'fechar_checkout' }
  | { action: 'go'; step: 'revisao' | 'telefone' }
  | { action: 'fechar_checkout_apos_restore' }

export function resolverFecharOuRevisao(params: {
  checkoutStep: DeliveryCheckoutStep
  voltarParaRevisao: boolean
  voltarParaIdentificacao: boolean
}): FecharOuRevisaoResult {
  const { checkoutStep, voltarParaRevisao, voltarParaIdentificacao } = params
  const saindoDeFluxoEndereco =
    checkoutStep === 'enderecoForm' ||
    checkoutStep === 'enderecos' ||
    checkoutStep === 'enderecoGeo'

  if (voltarParaRevisao) {
    if (checkoutStep === 'revisao') return { action: 'fechar_checkout' }
    return { action: 'go', step: 'revisao' }
  }

  if (voltarParaIdentificacao) {
    if (checkoutStep === 'telefone') return { action: 'fechar_checkout' }
    return { action: 'go', step: 'telefone' }
  }

  if (saindoDeFluxoEndereco) {
    return { action: 'fechar_checkout_apos_restore' }
  }

  return { action: 'fechar_checkout' }
}

export type CancelarGeoResult =
  | { action: 'go'; step: 'enderecos' | 'telefone' }
  | { action: 'fechar_ou_revisao' }

export function resolverCancelarGeo(params: {
  quantidadeEnderecos: number
  voltarParaIdentificacao: boolean
}): CancelarGeoResult {
  if (params.quantidadeEnderecos > 0) return { action: 'go', step: 'enderecos' }
  if (params.voltarParaIdentificacao) return { action: 'go', step: 'telefone' }
  return { action: 'fechar_ou_revisao' }
}
