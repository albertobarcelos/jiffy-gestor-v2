import { describe, expect, it } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import type { VendaDetalheCarregadaDTO } from '@/src/application/dto/VendaDetalheCarregadaDTO'
import { patchVendaDetalheResumoFiscalCache } from '@/src/presentation/components/features/pedidos/hooks/data/useVendaDetalheCarregadaQuery'

function dtoBase(
  overrides: Partial<VendaDetalheCarregadaDTO> = {}
): VendaDetalheCarregadaDTO {
  return {
    origem: null,
    status: 'FINALIZADA',
    statusFiscal: 'PENDENTE',
    clienteId: null,
    clienteNome: null,
    produtos: [],
    pagamentos: [],
    fluxoPagamentoEntrega: 'ja_pago',
    detalhesPedidoMeta: null,
    resumoFiscal: {
      status: 'PENDENTE',
      retornoSefaz: null,
    },
    resumoFinanceiroDetalhes: null,
    detalhesEntregaPedido: null,
    nomesUsuariosPedido: {},
    nomesMeiosPagamentoPedido: {},
    dataVenda: null,
    valorFinalVenda: null,
    dataFinalizacaoCarregada: null,
    vendaGestorJaCancelada: false,
    observacaoPedido: null,
    irParaStep4: true,
    ...overrides,
  }
}

describe('patchVendaDetalheResumoFiscalCache', () => {
  it('atualiza status e retorno SEFAZ no cache do detalhe (rejeição NCM)', () => {
    const queryClient = new QueryClient()
    const vendaId = 'venda-1'
    const empresaId = 'empresa-1'
    const queryKey = [
      'tenant',
      empresaId,
      'venda-detalhe-carregada',
      vendaId,
      'venda_gestor',
      'visualizacao',
    ] as const

    queryClient.setQueryData(queryKey, dtoBase())

    patchVendaDetalheResumoFiscalCache(
      queryClient,
      vendaId,
      {
        statusFiscal: 'REJEITADA',
        retornoSefaz: 'NCM não configurado',
        documentoFiscalId: 'doc-1',
      },
      empresaId
    )

    const atualizado = queryClient.getQueryData<VendaDetalheCarregadaDTO>(queryKey)
    expect(atualizado?.statusFiscal).toBe('REJEITADA')
    expect(atualizado?.resumoFiscal?.status).toBe('REJEITADA')
    expect(atualizado?.resumoFiscal?.retornoSefaz).toBe('NCM não configurado')
    expect(atualizado?.resumoFiscal?.documentoFiscalId).toBe('doc-1')
  })

  it('cria resumoFiscal quando ainda não existia no cache', () => {
    const queryClient = new QueryClient()
    const vendaId = 'venda-2'
    const queryKey = [
      'tenant',
      'empresa-x',
      'venda-detalhe-carregada',
      vendaId,
      'venda',
      'visualizacao',
    ] as const

    queryClient.setQueryData(
      queryKey,
      dtoBase({ resumoFiscal: null, statusFiscal: null })
    )

    patchVendaDetalheResumoFiscalCache(queryClient, vendaId, {
      statusFiscal: 'REJEITADA',
      retornoSefaz: 'NCM não cadastrado',
    })

    const atualizado = queryClient.getQueryData<VendaDetalheCarregadaDTO>(queryKey)
    expect(atualizado?.statusFiscal).toBe('REJEITADA')
    expect(atualizado?.resumoFiscal?.status).toBe('REJEITADA')
    expect(atualizado?.resumoFiscal?.retornoSefaz).toBe('NCM não cadastrado')
  })
})
