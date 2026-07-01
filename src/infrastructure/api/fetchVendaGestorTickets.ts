import { carregarPayloadTicketsImpressaoDelivery } from '@/src/application/delivery/carregarPayloadTicketsImpressaoDelivery'
import type { PreferenciasImpressaoDelivery } from '@/src/shared/types/deliveryImpressao'
import type { VendaGestorTicketsResponse } from '@/src/shared/types/vendaGestorTickets'
import type { EmpresaMeResumo } from '@/src/presentation/hooks/useEmpresaMe'

export type FetchVendaGestorTicketsResult =
  | { ok: true; data: VendaGestorTicketsResponse }
  | { ok: false; status: number; error?: string }

export type FetchVendaGestorTicketsContext = {
  prefs: PreferenciasImpressaoDelivery
  empresa?: EmpresaMeResumo | null
  estacaoImpressaoId?: string | null
}

/**
 * Monta payload de tickets via `instrucoes-impressao` + GET pedido (substitui `/tickets` no backend).
 */
export async function fetchVendaGestorTickets(
  vendaId: string,
  accessToken: string | undefined,
  context: FetchVendaGestorTicketsContext
): Promise<FetchVendaGestorTicketsResult> {
  return carregarPayloadTicketsImpressaoDelivery({
    vendaId,
    accessToken,
    prefs: context.prefs,
    empresa: context.empresa,
    estacaoImpressaoId: context.estacaoImpressaoId,
  })
}
