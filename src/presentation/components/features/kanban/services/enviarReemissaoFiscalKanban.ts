import { emitirNotaPedidoDeliveryUseCase } from '@/src/application/use-cases/delivery/EmitirNotaPedidoDeliveryUseCase'
import {
  deveUsarModuloDeliveryParaEmissaoFiscal,
  montarBodyReemitirNota,
  resolveFiscalEmissionConfig,
} from '@/src/presentation/hooks/useVendas'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { resolveModeloParaEmitirNota } from '../hooks/useVendasUnificadas'
import type { Venda } from '../types'

async function parseErroResponse(response: Response): Promise<string> {
  const errorData = await response.json().catch(() => ({}))
  const msg =
    (errorData as { error?: string; message?: string }).error ||
    (errorData as { error?: string; message?: string }).message
  return msg || `Erro ${response.status}: ${response.statusText}`
}

async function emitirNotaSilenciosa(
  token: string,
  venda: Venda,
  modelo: 55 | 65
): Promise<void> {
  const fiscalConfig = await resolveFiscalEmissionConfig(token, modelo)
  const path =
    venda.tabelaOrigem === 'venda_gestor'
      ? `/api/vendas/gestor/${venda.id}/emitir-nota`
      : `/api/vendas/${venda.id}/emitir-nota`

  const response = await fetchGestorApi(path, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tipoDocumento: fiscalConfig.tipoDocumento,
      modelo,
      serie: fiscalConfig.serie,
      ambiente: fiscalConfig.ambiente,
      crt: fiscalConfig.crt,
    }),
  })
  if (!response.ok) {
    throw new Error(await parseErroResponse(response))
  }
}

async function reemitirNotaSilenciosa(token: string, venda: Venda): Promise<void> {
  const docId = venda.documentoFiscalId?.trim()
  if (!docId) {
    throw new Error('Documento fiscal não encontrado para reemissão.')
  }

  const numeroNotaRejeitada =
    venda.numeroFiscal != null && Number.isFinite(Number(venda.numeroFiscal))
      ? Number(venda.numeroFiscal)
      : undefined

  const body = montarBodyReemitirNota({
    documentId: docId,
    ...(numeroNotaRejeitada != null ? { numero: numeroNotaRejeitada } : {}),
  })

  const path =
    venda.tabelaOrigem === 'venda_gestor'
      ? `/api/vendas/gestor/${venda.id}/reemitir`
      : `/api/vendas/${venda.id}/reemitir`

  const response = await fetchGestorApi(path, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(await parseErroResponse(response))
  }
}

/**
 * Envia reemissão/emissão fiscal de uma venda sem toasts nem polling de status.
 * Usado pelo processamento em lote do Kanban.
 */
export async function enviarReemissaoFiscalKanban(
  token: string,
  venda: Venda
): Promise<void> {
  const docId = venda.documentoFiscalId?.trim()
  const usarDelivery = deveUsarModuloDeliveryParaEmissaoFiscal(
    venda.tabelaOrigem,
    venda.tipoVenda
  )
  const modelo = resolveModeloParaEmitirNota(venda)

  if (docId) {
    if (usarDelivery && modelo !== null) {
      await emitirNotaPedidoDeliveryUseCase.execute(venda.id, token, modelo)
      return
    }
    await reemitirNotaSilenciosa(token, venda)
    return
  }

  if (modelo === null) {
    throw new Error('Modelo fiscal não definido para emissão.')
  }

  if (modelo === 55 && !venda.cliente?.id?.trim()) {
    throw new Error('NF-e exige cliente cadastrado na venda.')
  }

  if (usarDelivery) {
    await emitirNotaPedidoDeliveryUseCase.execute(venda.id, token, modelo)
    return
  }

  await emitirNotaSilenciosa(token, venda, modelo)
}
