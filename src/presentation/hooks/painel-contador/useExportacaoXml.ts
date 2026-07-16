'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { createPainelContadorUseCases } from '@/src/presentation/hooks/painel-contador/fiscalPainelFactory'
import { showToast } from '@/src/shared/utils/toast'
import type {
  AgendamentoExportacaoXmlDTO,
  ExportacaoXmlDTO,
  ExportacaoXmlStatusDTO,
} from '@/src/application/dto/painel-contador/PainelContadorDTO'

const HISTORICO_QUERY_KEY = ['portal-contador', 'exportacao-xml', 'historico'] as const
const AGENDAMENTO_QUERY_KEY = ['portal-contador', 'exportacao-xml', 'agendamento'] as const
const STATUS_POLL_MS = 1500

function abrirDownload(url: string) {
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.target = '_blank'
  anchor.rel = 'noopener noreferrer'
  anchor.click()
}

/**
 * Converte progresso (contagem) + fase em percentual de UI.
 * Nunca chega a 100% enquanto status !== CONCLUIDO (ZIP ainda pode estar fechando).
 */
function percentualExportacao(status: ExportacaoXmlStatusDTO): number {
  if (status.status === 'CONCLUIDO') return 100
  if (status.fase === 'FINALIZANDO_ZIP') return 99

  const total = status.totalEncontrados ?? 0
  const feito = typeof status.progresso === 'number' ? status.progresso : 0
  if (total <= 0) return 0

  return Math.min(99, Math.floor((feito / total) * 100))
}

export function useExportacaoXml() {
  const queryClient = useQueryClient()
  const [exportacaoIdAtiva, setExportacaoIdAtiva] = useState<string | null>(null)
  const [progressoLocal, setProgressoLocal] = useState(0)
  const downloadDisparadoRef = useRef<string | null>(null)

  const iniciarMutation = useSecureTenantMutation(
    async ({ token }, input: ExportacaoXmlDTO) => {
      const { exportarXmls } = createPainelContadorUseCases(token)
      return exportarXmls.iniciar(input)
    },
    {
      onSuccess: (result) => {
        downloadDisparadoRef.current = null
        setProgressoLocal(0)
        setExportacaoIdAtiva(result.exportacaoId)
        showToast.success('Exportação iniciada. Acompanhe o progresso.')
        void queryClient.invalidateQueries({ queryKey: [...HISTORICO_QUERY_KEY] })
      },
      onError: (error: Error) => {
        showToast.error(error.message || 'Erro ao iniciar exportação de XMLs')
      },
    }
  )

  const statusQuery = useSecureTenantQuery<ExportacaoXmlStatusDTO>(
    ['portal-contador', 'exportacao-xml', 'status', exportacaoIdAtiva],
    async ({ token }) => {
      const { exportarXmls } = createPainelContadorUseCases(token)
      return exportarXmls.consultarStatus(exportacaoIdAtiva!)
    },
    {
      enabled: Boolean(exportacaoIdAtiva),
      refetchInterval: (query) => {
        const status = query.state.data?.status
        if (!exportacaoIdAtiva) return false
        if (status === 'CONCLUIDO' || status === 'ERRO') return false
        return STATUS_POLL_MS
      },
      refetchIntervalInBackground: true,
    }
  )

  useEffect(() => {
    const data = statusQuery.data
    if (!data) return
    setProgressoLocal(percentualExportacao(data))
  }, [statusQuery.data])

  const baixarMutation = useSecureTenantMutation(
    async ({ token }, id: string) => {
      const { exportarXmls } = createPainelContadorUseCases(token)
      return exportarXmls.obterUrlDownload(id)
    },
    {
      onSuccess: (result) => {
        abrirDownload(result.url)
        showToast.success('Download iniciado.')
        void queryClient.invalidateQueries({ queryKey: [...HISTORICO_QUERY_KEY] })
      },
      onError: (error: Error) => {
        showToast.error(error.message || 'Erro ao baixar ZIP')
        void queryClient.invalidateQueries({ queryKey: [...HISTORICO_QUERY_KEY] })
      },
    }
  )

  const baixarMutateAsync = baixarMutation.mutateAsync

  useEffect(() => {
    const status = statusQuery.data
    if (!status || !exportacaoIdAtiva) return

    if (status.status === 'ERRO') {
      showToast.error(status.mensagemErro || 'Falha na exportação de XMLs')
      setExportacaoIdAtiva(null)
      void queryClient.invalidateQueries({ queryKey: [...HISTORICO_QUERY_KEY] })
      return
    }

    if (
      status.status === 'CONCLUIDO' &&
      downloadDisparadoRef.current !== status.exportacaoId
    ) {
      downloadDisparadoRef.current = status.exportacaoId
      setProgressoLocal(100)
      void baixarMutateAsync(status.exportacaoId)
        .catch(() => undefined)
        .finally(() => {
          setExportacaoIdAtiva(null)
          void queryClient.invalidateQueries({ queryKey: [...HISTORICO_QUERY_KEY] })
        })
    }
  }, [statusQuery.data, exportacaoIdAtiva, baixarMutateAsync, queryClient])

  const exportarXmls = useCallback(
    async (input: ExportacaoXmlDTO) => {
      await iniciarMutation.mutateAsync(input)
    },
    [iniciarMutation]
  )

  const baixarExportacao = useCallback(
    async (id: string) => {
      await baixarMutateAsync(id)
    },
    [baixarMutateAsync]
  )

  const cancelarAcompanhamento = useCallback(() => {
    setExportacaoIdAtiva(null)
    setProgressoLocal(0)
    downloadDisparadoRef.current = null
  }, [])

  const isExportando =
    iniciarMutation.isPending ||
    Boolean(exportacaoIdAtiva) ||
    baixarMutation.isPending

  return {
    exportarXmls,
    baixarExportacao,
    cancelarAcompanhamento,
    isExportando,
    isIniciando: iniciarMutation.isPending,
    isBaixando: baixarMutation.isPending,
    exportacaoIdAtiva,
    status: statusQuery.data ?? null,
    progresso: progressoLocal,
  }
}

export function useHistoricoExportacaoXml(page = 0, size = 10) {
  return useSecureTenantQuery(
    [...HISTORICO_QUERY_KEY, page, size],
    async ({ token }) => {
      const { exportarXmls } = createPainelContadorUseCases(token)
      return exportarXmls.listarHistorico(page, size)
    },
    {
      staleTime: 15_000,
    }
  )
}

export function useAgendamentoExportacaoXml() {
  const queryClient = useQueryClient()

  const query = useSecureTenantQuery(
    [...AGENDAMENTO_QUERY_KEY],
    async ({ token }) => {
      const { exportarXmls } = createPainelContadorUseCases(token)
      return exportarXmls.buscarAgendamento()
    },
    {
      staleTime: 30_000,
    }
  )

  const salvarMutation = useSecureTenantMutation(
    async ({ token }, input: AgendamentoExportacaoXmlDTO) => {
      const { exportarXmls } = createPainelContadorUseCases(token)
      return exportarXmls.salvarAgendamento(input)
    },
    {
      onSuccess: (data) => {
        showToast.success('Agendamento mensal salvo.')
        queryClient.setQueriesData({ queryKey: [...AGENDAMENTO_QUERY_KEY] }, data)
        void queryClient.invalidateQueries({ queryKey: [...AGENDAMENTO_QUERY_KEY] })
      },
      onError: (error: Error) => {
        showToast.error(error.message || 'Erro ao salvar agendamento')
      },
    }
  )

  const desativarMutation = useSecureTenantMutation(
    async ({ token }) => {
      const { exportarXmls } = createPainelContadorUseCases(token)
      return exportarXmls.desativarAgendamento()
    },
    {
      onSuccess: () => {
        showToast.success('Agendamento desativado.')
        void queryClient.invalidateQueries({ queryKey: [...AGENDAMENTO_QUERY_KEY] })
      },
      onError: (error: Error) => {
        showToast.error(error.message || 'Erro ao desativar agendamento')
      },
    }
  )

  return {
    agendamento: query.data ?? null,
    isLoading: query.isLoading,
    salvarAgendamento: salvarMutation.mutateAsync,
    desativarAgendamento: desativarMutation.mutateAsync,
    isSalvando: salvarMutation.isPending,
    isDesativando: desativarMutation.isPending,
  }
}
