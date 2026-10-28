import type { AcaoTransicaoGestor } from '@/src/application/dto/TransicaoKanbanDTO'
import type { TipoDedupeImpressaoDelivery } from '@/src/application/delivery/impressaoDeliveryDedupe'
import type {
  AcaoImpressaoAutomatica,
  DecidirImpressaoResultado,
  PreferenciasImpressaoDelivery,
} from '@/src/shared/types/deliveryImpressao'

export function ehAcaoImpressaoAutomatica(
  acao: AcaoTransicaoGestor
): acao is AcaoImpressaoAutomatica {
  return acao === 'iniciar_preparo' || acao === 'marcar_pronto'
}

/** Dedupe é só anti-duplicata. A política de “imprimir ou não” fica em `decidirImpressaoAposAcao`. */
export function tipoDedupePorAcaoAutomatica(
  acao: AcaoImpressaoAutomatica
): TipoDedupeImpressaoDelivery {
  return acao === 'marcar_pronto' ? 'expedicao' : 'comando'
}

/**
 * Única política de cupom automático: quadro e Socket.
 *
 * - `imprimirAoReceber` → `iniciar_preparo` (unificado = cupom completo; separado = produção).
 * - `imprimirAoFicarPronto` → `marcar_pronto` só no modo separado.
 * - `copiasCupomUnificado` → só o cupom unificado.
 */
export function decidirImpressaoAposAcao(
  prefs: PreferenciasImpressaoDelivery,
  acao: AcaoTransicaoGestor
): DecidirImpressaoResultado {
  if (!ehAcaoImpressaoAutomatica(acao)) {
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
