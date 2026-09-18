/** Modo configurado na empresa (`parametroEmpresa.modoImpressaoDelivery`). Canônicos: `unificado` | `separado`. */
export type ModoImpressaoDelivery = 'unificado' | 'separado'

/**
 * Tipo de cupom gerado em memória (layout).
 * - `producao_completa`: modo unificado — cupom completo em `iniciar_preparo`.
 * - `producao_cozinha`: modo separado — produção em `iniciar_preparo` (impressoras por produto).
 * - `expedicao`: modo separado — expedição em `marcar_pronto`.
 */
export type TipoCupomDelivery = 'producao_completa' | 'producao_cozinha' | 'expedicao'

/**
 * Preferências de impressão delivery em `parametroEmpresa` (`GET /empresas/me`).
 * Cópias do modo unificado (`copiasCupomUnificado`) não se aplicam aos tickets do modo separado até haver campos específicos na API.
 */
export interface PreferenciasImpressaoDelivery {
  modo: ModoImpressaoDelivery
  copiasCupomUnificado: number
  autoIniciarPreparoNovosPedidos: boolean
  imprimirAoReceber: boolean
  imprimirAoFicarPronto: boolean
  impressoraExpedicaoId: string | null
}

export const DEFAULT_PREFERENCIAS_IMPRESSAO_DELIVERY: PreferenciasImpressaoDelivery = {
  modo: 'unificado',
  copiasCupomUnificado: 1,
  autoIniciarPreparoNovosPedidos: false,
  imprimirAoReceber: true,
  imprimirAoFicarPronto: true,
  impressoraExpedicaoId: null,
}

export type DecidirImpressaoResultado = {
  imprimir: boolean
  tipoCupom: TipoCupomDelivery | null
  copies: number
}

/** Usado pelo hook de reimpressão manual (inferência pela coluna atual). */
export function tipoCupomParaReimpressao(
  modo: ModoImpressaoDelivery,
  colunaOperacional: 'NOVOS_PEDIDOS' | 'EM_PREPARO' | 'PRONTO_ENTREGA' | 'EM_ROTA'
): TipoCupomDelivery {
  if (modo === 'unificado') {
    return 'producao_completa'
  }
  if (colunaOperacional === 'PRONTO_ENTREGA' || colunaOperacional === 'EM_ROTA') {
    return 'expedicao'
  }
  return 'producao_cozinha'
}
