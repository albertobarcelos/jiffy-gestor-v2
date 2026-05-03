import { buildCupomDelivery } from '@/src/application/delivery/buildCupomDelivery'
import {
  agruparItensProducaoPorImpressora,
  FALLBACK_IMPRESSORA_AGRUPAMENTO,
  montarVendaCupomComSubconjunto,
} from '@/src/application/delivery/agruparProducaoPorImpressora'
import type {
  ModoImpressaoDelivery,
  PreferenciasImpressaoDelivery,
  VendaGestorCupomDTO,
} from '@/src/shared/types/deliveryImpressao'
import { fetchImpressorasIdsDoProduto } from '@/src/infrastructure/api/fetchProdutoImpressorasIds'
import { fetchNomeImpressoraPorId } from '@/src/infrastructure/api/fetchNomeImpressoraPorId'
import { printDeliveryCupom } from '@/src/infrastructure/printing/printDeliveryCupom'

function padraoQz(prefs: PreferenciasImpressaoDelivery): string | null {
  return (
    prefs.impressoraPadraoNome ||
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_QZ_PRINTER_DEFAULT?.trim()
      ? process.env.NEXT_PUBLIC_QZ_PRINTER_DEFAULT.trim()
      : null)
  )
}

/**
 * Modo **separado**, ticket de **produção**: uma folha por impressora lógica,
 * itens da mesma impressora no mesmo cupom; 1 cópia por impressora.
 * Produto com várias impressoras: o mesmo item aparece em mais de um cupom (uma vez por destino).
 */
export async function imprimirProducaoSeparadoPorImpressora(params: {
  dto: VendaGestorCupomDTO
  modo: ModoImpressaoDelivery
  prefs: PreferenciasImpressaoDelivery
  nomeEmpresa?: string
  accessToken: string
  onMensagem?: (mensagem: string) => void
}): Promise<void> {
  const { dto, modo, prefs, nomeEmpresa, accessToken, onMensagem } = params

  const produtoIds = [
    ...new Set(dto.produtos.map(p => p.produtoId).filter((x): x is string => Boolean(x?.trim()))),
  ]

  const impressorasPorProduto = new Map<string, string[]>()
  await Promise.all(
    produtoIds.map(async pid => {
      const ids = await fetchImpressorasIdsDoProduto(pid, accessToken)
      impressorasPorProduto.set(pid, ids)
    })
  )

  const buckets = agruparItensProducaoPorImpressora(dto.produtos, impressorasPorProduto)
  if (buckets.size === 0) return

  for (const [impressoraIdBucket, itens] of buckets) {
    if (itens.length === 0) continue

    const partial = montarVendaCupomComSubconjunto(dto, itens)

    let nomeQz: string | null
    let rotulo: string
    if (impressoraIdBucket === FALLBACK_IMPRESSORA_AGRUPAMENTO) {
      nomeQz = padraoQz(prefs)
      rotulo = 'Impressora padrão'
    } else {
      nomeQz = await fetchNomeImpressoraPorId(impressoraIdBucket, accessToken)
      rotulo = nomeQz ?? impressoraIdBucket
    }

    const html = buildCupomDelivery(partial, modo, 'producao_cozinha', {
      nomeEmpresa,
      rotuloImpressora: rotulo,
    })

    const r = await printDeliveryCupom({
      html,
      printerName: nomeQz,
      copies: 1,
      jobName: `Produção #${dto.numeroVenda} ${rotulo}`,
    })
    if (r.ok && r.mensagem) onMensagem?.(r.mensagem)
  }
}
