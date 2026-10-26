import { resolverEstacaoReceptoraDelivery } from '@/src/domain/caixa-estacao/estacaoReceptoraDelivery'
import { EtapaOperacionalDelivery } from '@/src/domain/value-objects/EtapaOperacionalDelivery'

export type ResumoStatusDeliveryRealtime = {
  vendaId: string | null
  statusDelivery: string | null
}

export type DecisaoImpressaoExpedicaoPronto = {
  imprimir: boolean
  receptoraId: string | null
}

function objetoRaiz(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const registro = raw as Record<string, unknown>
  if (registro.data != null && typeof registro.data === 'object' && !Array.isArray(registro.data)) {
    return registro.data as Record<string, unknown>
  }
  return registro
}

function textoCampo(o: Record<string, unknown>, ...campos: string[]): string | null {
  for (const campo of campos) {
    const valor = o[campo]
    if (valor == null) continue
    const texto = String(valor).trim()
    if (texto) return texto
  }
  return null
}

/** Lê id e status do summary Socket.IO (`PEDIDO_DELIVERY_STATUS_ALTERADO`). */
export function lerResumoStatusDelivery(raw: unknown): ResumoStatusDeliveryRealtime {
  const o = objetoRaiz(raw)
  if (!o) return { vendaId: null, statusDelivery: null }
  return {
    vendaId: textoCampo(o, 'vendaId', 'id'),
    statusDelivery: textoCampo(
      o,
      'statusDelivery',
      'statusEtapaOperacional',
      'statusOperacional',
      'status'
    ),
  }
}

/** O celular do entregador só avisa a lista. O cupom sai no PC da receptora. */
export function deveImprimirCupomExpedicaoNesteCliente(superficieApp: boolean): boolean {
  return !superficieApp
}

/**
 * Imprime no PRONTO só se a estação deste PC for a receptora da loja.
 * Sem estação neste navegador, ou se este PC não for a principal: não imprime.
 */
export function decidirImpressaoExpedicaoNoPronto(input: {
  estacaoDestePcId: string | null | undefined
  estacoes: readonly { id: string; gestorDelivery: boolean; ativo?: boolean }[]
  statusDelivery: string | null | undefined
}): DecisaoImpressaoExpedicaoPronto {
  const receptora = resolverEstacaoReceptoraDelivery(
    input.estacoes.filter(estacao => estacao.ativo !== false && estacao.id.trim())
  )
  const receptoraId = receptora?.id ?? null
  if (EtapaOperacionalDelivery.tryParse(input.statusDelivery)?.valor !== 'PRONTO') {
    return { imprimir: false, receptoraId }
  }
  const local = String(input.estacaoDestePcId ?? '').trim()
  if (!local || !receptoraId || local !== receptoraId) {
    return { imprimir: false, receptoraId }
  }
  return { imprimir: true, receptoraId }
}
