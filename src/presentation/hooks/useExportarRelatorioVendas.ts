'use client'

import { useCallback, useState } from 'react'
import toast from 'react-hot-toast'
import { showToast } from '@/src/shared/utils/toast'
import { buscarTodasVendasFiltradas } from '@/src/presentation/utils/vendas/buscarTodasVendasFiltradas'
import {
  buscarMetodosPagamentoPeriodo,
  temFiltrosExtrasAlemPeriodo,
} from '@/src/presentation/utils/vendas/buscarMetodosPagamentoPeriodo'
import { exportarRelatorioVendasXlsx } from '@/src/presentation/utils/vendas/exportarRelatorioVendasXlsx'
import {
  buscarDetalhesVendasParaExport,
  enriquecerMeiosPagamentoParaExport,
} from '@/src/presentation/utils/vendas/vendasPagamentoExport'
import { fetchEmpresaMeQueryData } from '@/src/presentation/hooks/useEmpresaMe'
import type {
  MetricasVendas,
  RelatorioVendasExportInput,
  VendasFiltrosQuerySnapshot,
} from '@/src/presentation/utils/vendas/vendasListTypes'

export function useExportarRelatorioVendas() {
  const [isExportando, setIsExportando] = useState(false)

  const exportar = useCallback(async (input: RelatorioVendasExportInput) => {
    if (input.filters.periodo === 'Todos' && !input.filters.periodoInicial) {
      showToast.error('Selecione um período para exportar o relatório.')
      return
    }

    setIsExportando(true)
    const toastId = showToast.loading('Preparando exportação...')

    let exportInput = input
    if (exportInput.contexto.cnpjEmpresa === '—' || exportInput.contexto.nomeEmpresa === 'Empresa') {
      try {
        const empresaData = await fetchEmpresaMeQueryData(input.token)
        exportInput = {
          ...input,
          timeZoneEmpresa: empresaData.timezoneAgregacao || input.timeZoneEmpresa,
          contexto: {
            ...input.contexto,
            nomeEmpresa: empresaData.empresa.nomeExibicao,
            cnpjEmpresa: empresaData.empresa.cnpj ?? '—',
          },
        }
      } catch {
        // Mantém contexto enviado pela tela
      }
    }

    try {
      const { vendas, metricas } = await buscarTodasVendasFiltradas({
        filters: exportInput.filters,
        token: exportInput.token,
        timeZoneEmpresa: exportInput.timeZoneEmpresa,
        onProgress: (carregadas: number) => {
          toast.loading(`Carregando vendas (${carregadas})...`, { id: toastId })
        },
      })

      toast.loading('Buscando formas de pagamento...', { id: toastId })

      let metodosPagamento: Awaited<ReturnType<typeof buscarMetodosPagamentoPeriodo>> = []
      let avisoPagamentos: string | undefined

      try {
        metodosPagamento = await buscarMetodosPagamentoPeriodo({
          filters: exportInput.filters,
          token: exportInput.token,
          timeZoneEmpresa: exportInput.timeZoneEmpresa,
        })
        if (temFiltrosExtrasAlemPeriodo(exportInput.filters)) {
          avisoPagamentos =
            'Formas de pagamento consideram apenas o período (vendas finalizadas), não os demais filtros da lista.'
        }
      } catch {
        avisoPagamentos = 'Não foi possível carregar formas de pagamento para este período.'
      }

      toast.loading('Carregando detalhes das vendas...', { id: toastId })

      const { pagamentosPorVendaId, quantidadeProdutosPorVendaId, taxasLancadasPorVendaId } =
        await buscarDetalhesVendasParaExport({
          vendas,
          token: exportInput.token,
          onProgress: (processadas, total) => {
            toast.loading(`Carregando detalhes (${processadas}/${total})...`, { id: toastId })
          },
        })

      const meiosPagamentoPorId = await enriquecerMeiosPagamentoParaExport(
        exportInput.meiosPagamentoPorId,
        pagamentosPorVendaId,
        exportInput.token
      )

      toast.loading('Gerando planilha...', { id: toastId })

      await exportarRelatorioVendasXlsx({
        exportInput: { ...exportInput, meiosPagamentoPorId },
        vendas,
        metricas: exportInput.metricas ?? metricas,
        metodosPagamento,
        pagamentosPorVendaId,
        quantidadeProdutosPorVendaId,
        taxasLancadasPorVendaId,
        avisoPagamentos,
      })

      showToast.successLoading(toastId, 'Relatório exportado com sucesso.')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao exportar relatório de vendas'
      showToast.errorLoading(toastId, message)
    } finally {
      setIsExportando(false)
    }
  }, [])

  return { exportar, isExportando }
}

export type { VendasFiltrosQuerySnapshot, MetricasVendas, RelatorioVendasExportInput }
