import { agruparItensProducaoPorImpressora } from '@/src/application/delivery/agruparProducaoPorImpressora'
import type {
  ModoImpressaoDelivery,
  PreferenciasImpressaoDelivery,
  VendaGestorCupomDTO,
} from '@/src/shared/types/deliveryImpressao'
import { fetchImpressorasIdsDoProduto } from '@/src/infrastructure/api/fetchProdutoImpressorasIds'
import { printDeliveryCupom } from '@/src/infrastructure/printing/printDeliveryCupom'
import { buscarMapeamentosEstacao } from '@/src/infrastructure/api/estacoesImpressaoApi'
import { getEstacaoImpressaoId } from '@/src/infrastructure/printing/estacaoImpressaoStorage'
import { buildPrintJobId } from '@/src/infrastructure/printing/agent/printJobId'
import type { PrintContentBlock } from '@/src/infrastructure/printing/agent/printJobTypes'

/**
 * Modo **separado**, ticket de **produção**: uma folha por impressora lógica,
 * itens da mesma impressora no mesmo cupom; 1 cópia por impressora.
 */
export async function imprimirProducaoSeparadoPorImpressora(params: {
  dto: VendaGestorCupomDTO
  modo: ModoImpressaoDelivery
  prefs: PreferenciasImpressaoDelivery
  nomeEmpresa?: string
  accessToken: string
  onMensagem?: (mensagem: string) => void
}): Promise<void> {
  const { dto, accessToken, onMensagem } = params

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

  const estacaoId = getEstacaoImpressaoId()
  const mapeamentos =
    estacaoId && accessToken ? await buscarMapeamentosEstacao(accessToken, estacaoId).catch(() => []) : []

  for (const [impressoraIdBucket, itens] of buckets) {
    if (itens.length === 0) continue

    const printerName =
      mapeamentos.find(m => m.impressoraId === impressoraIdBucket)?.nomeImpressoraWindows?.trim() || ''
    if (!printerName) {
      onMensagem?.(
        'Vincule as impressoras lógicas de produção a uma impressora deste PC em Configurações de impressão.'
      )
      continue
    }

    const content: PrintContentBlock[] = [
      {
        type: 'text',
        text: `PRODUCAO #${dto.numeroVenda}`,
        align: 'center',
        bold: true,
        size: 'double',
      },
      { type: 'divider' },
    ]
    for (const item of itens) {
      const q = Number.isFinite(item.quantidade) && item.quantidade > 0 ? Math.floor(item.quantidade) : 1
      content.push({ type: 'item', quantity: q, name: item.descricao.trim() || 'Item' })
      if (item.observacao?.trim()) {
        content.push({ type: 'text', text: `  ${item.observacao.trim()}` })
      }
    }
    content.push({ type: 'feed', lines: 3 }, { type: 'cut' })

    const r = await printDeliveryCupom({
      jobId: buildPrintJobId({
        vendaId: dto.id,
        tipoCupom: 'producao',
        ticketKey: impressoraIdBucket,
      }),
      printerName,
      copies: 1,
      document: { type: 'ORDER', content },
    })
    if (!r.ok && r.mensagem) onMensagem?.(r.mensagem)
  }
}
