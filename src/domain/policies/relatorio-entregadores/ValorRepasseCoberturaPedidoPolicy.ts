import {
  COBERTURA_AVULSA_ID,
  idCoberturaRelatorio,
  type CoberturaRelatorio,
  type PedidoRelatorioEntregadores,
} from '@/src/domain/relatorio-entregadores/tipos'

export type RepasseCoberturaPedido =
  | { status: 'ok'; valor: number; coberturaId: string }
  | { status: 'sem_cobertura' }

function coberturaPorOrigem(
  coberturas: readonly CoberturaRelatorio[],
  tipo: CoberturaRelatorio['tipo'],
  origemId: string
): CoberturaRelatorio | undefined {
  const id = idCoberturaRelatorio(tipo, origemId)
  return coberturas.find(c => c.id === id)
}

function coberturaPorValorUnico(
  coberturas: readonly CoberturaRelatorio[],
  valor: number
): CoberturaRelatorio | undefined {
  const iguais = coberturas.filter(c => Math.abs(c.valorTaxa - valor) < 0.009)
  return iguais.length === 1 ? iguais[0] : undefined
}

/**
 * Valor a pagar: snapshot da zona; se só houver o valor da taxa no pedido,
 * ainda conta (e tenta casar com a área/raio de mesmo preço).
 */
export class ValorRepasseCoberturaPedidoPolicy {
  static resolver(
    pedido: PedidoRelatorioEntregadores,
    coberturas: readonly CoberturaRelatorio[]
  ): RepasseCoberturaPedido {
    const snap = pedido.cobertura
    if (!snap) return { status: 'sem_cobertura' }

    const areaId = snap.areaId?.trim() || null
    const raioId = snap.raioId?.trim() || null
    const valorSnap =
      snap.valorCalculadoSistema != null && Number.isFinite(snap.valorCalculadoSistema)
        ? snap.valorCalculadoSistema
        : null

    if (areaId) {
      const area = coberturaPorOrigem(coberturas, 'area', areaId)
      const valor = valorSnap ?? area?.valorTaxa
      if (valor != null) {
        return { status: 'ok', valor, coberturaId: idCoberturaRelatorio('area', areaId) }
      }
    }

    if (raioId) {
      const raio = coberturaPorOrigem(coberturas, 'raio', raioId)
      const valor = valorSnap ?? raio?.valorTaxa
      if (valor != null) {
        return { status: 'ok', valor, coberturaId: idCoberturaRelatorio('raio', raioId) }
      }
    }

    if (valorSnap != null) {
      const casada = coberturaPorValorUnico(coberturas, valorSnap)
      return {
        status: 'ok',
        valor: valorSnap,
        coberturaId: casada?.id ?? COBERTURA_AVULSA_ID,
      }
    }

    return { status: 'sem_cobertura' }
  }
}
