'use client'

import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { createPainelContadorUseCases } from '@/src/presentation/hooks/painel-contador/fiscalPainelFactory'
import { useResumoEmpresaPainel } from '@/src/presentation/hooks/painel-contador/useResumoEmpresaPainel'
import { showToast } from '@/src/shared/utils/toast'
import {
  buildExportacaoXmlFilename,
  periodoExportacaoXml,
} from '@/src/shared/utils/exportacaoXmlFilename'
import type {
  ExportacaoXmlDTO,
  ExportacaoXmlResumoDTO,
} from '@/src/application/dto/painel-contador/PainelContadorDTO'

function isExportacaoZip(
  result: { blob: Blob; filename: string } | ExportacaoXmlResumoDTO
): result is { blob: Blob; filename: string } {
  return 'blob' in result && result.blob instanceof Blob
}

function baixarArquivo(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function useExportacaoXml() {
  const { data: resumo } = useResumoEmpresaPainel()

  const exportarMutation = useSecureTenantMutation(
    async ({ token }, input: ExportacaoXmlDTO) => {
      const { exportarXmls } = createPainelContadorUseCases(token)
      return exportarXmls.execute(input)
    },
    {
      onSuccess: (result, input) => {
        if (isExportacaoZip(result)) {
          const nomeEmpresa = resumo?.nomeExibicao ?? 'Empresa'
          const filename = buildExportacaoXmlFilename(nomeEmpresa, periodoExportacaoXml(input))
          baixarArquivo(result.blob, filename)
          showToast.success('Exportação concluída. Download iniciado.')
          return
        }

        const total = result.totalArquivos ?? result.totalDocumentos ?? '—'
        showToast.success(`Exportação concluída. ${total} arquivo(s) no período.`)
      },
      onError: (error: Error) => {
        showToast.error(error.message || 'Erro ao exportar XMLs')
      },
    }
  )

  return {
    exportarXmls: exportarMutation.mutateAsync,
    isExportando: exportarMutation.isPending,
  }
}
