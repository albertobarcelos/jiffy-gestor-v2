import type { AcaoTransicaoGestor } from '@/src/presentation/hooks/useVendas'
import type {
  DecidirImpressaoResultado,
  PreferenciasImpressaoDelivery,
  TipoCupomDelivery,
} from '@/src/shared/types/deliveryImpressao'

/**
 * Define se deve imprimir automaticamente após uma transição bem-sucedida e qual cupom.
 *
 * Contrato de produto / backend:
 * - `imprimirAoReceber` → após `iniciar_preparo`.
 * - `imprimirAoFicarPronto` → após `marcar_pronto` (modo separado; em unificado sem efeito prático).
 * - `copiasCupomUnificado` → só cupom unificado completo; modo separado usa 1 cópia por ticket até haver campos na API.
 */
export function decidirImpressaoAposAcao(
  prefs: PreferenciasImpressaoDelivery,
  acao: AcaoTransicaoGestor
): DecidirImpressaoResultado {
  if (acao !== 'iniciar_preparo' && acao !== 'marcar_pronto') {
    return { imprimir: false, tipoCupom: null, copies: 1 }
  }

  if (prefs.modo === 'unificado') {
    if (acao === 'iniciar_preparo' && prefs.imprimirAoReceber) {
      return {
        imprimir: true,
        tipoCupom: 'producao_completa',
        copies: prefs.copiasCupomUnificado,
      }
    }
    return { imprimir: false, tipoCupom: null, copies: 1 }
  }

  if (acao === 'iniciar_preparo' && prefs.imprimirAoReceber) {
    return { imprimir: true, tipoCupom: 'producao_cozinha', copies: 1 }
  }
  if (acao === 'marcar_pronto' && prefs.imprimirAoFicarPronto) {
    return { imprimir: true, tipoCupom: 'expedicao', copies: 1 }
  }

  return { imprimir: false, tipoCupom: null, copies: 1 }
}

/**
 * Nome da impressora no Windows (QZ). Expedição: nome resolvido de `impressoraExpedicaoId` ou fallback.
 * Produção (separado): fallback até mapeamento produto → impressora na venda/cardápio.
 */
export function resolverNomeImpressoraParaCupom(
  prefs: PreferenciasImpressaoDelivery,
  tipo: TipoCupomDelivery,
  /** De GET `/api/impressoras/:id` quando `impressoraExpedicaoId` está definido. */
  nomeImpressoraExpedicaoQz: string | null
): string | null {
  const padrao =
    prefs.impressoraPadraoNome ||
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_QZ_PRINTER_DEFAULT?.trim()
      ? process.env.NEXT_PUBLIC_QZ_PRINTER_DEFAULT.trim()
      : null)

  if (tipo === 'expedicao') {
    return nomeImpressoraExpedicaoQz || padrao
  }
  return padrao
}
