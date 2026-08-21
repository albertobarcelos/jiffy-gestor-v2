'use client'

import { useRef, useState } from 'react'
import { Button } from '@/src/presentation/components/ui/button'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { useCbenef } from '@/src/presentation/hooks/painel-contador/useCbenef'
import type { ImportarCbenefResultadoDTO } from '@/src/application/dto/painel-contador/PainelContadorDTO'
import { showToast } from '@/src/shared/utils/toast'

export function ImportarCbenefView() {
  const { importarMutation } = useCbenef('')
  const inputRef = useRef<HTMLInputElement>(null)
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null)
  const [resultado, setResultado] = useState<ImportarCbenefResultadoDTO | null>(null)

  const handleArquivo = async (file: File | undefined) => {
    if (!file) return
    setNomeArquivo(file.name)
    setResultado(null)

    try {
      const data = await importarMutation.mutateAsync(file)
      setResultado(data)
      showToast.success('Tabela cBenef importada')
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : 'Erro ao importar tabela cBenef'
      showToast.error(mensagem)
    }
  }

  return (
    <div className="flex h-full w-full flex-col bg-info p-6">
      <div className="mb-6">
        <h2 className="mb-2 text-2xl font-semibold text-alternate">Tabela cBenef</h2>
        <p className="text-sm text-secondary-text">
          Importe a tabela de Código de Benefício Fiscal quando a SEFAZ publicar uma nova versão.
          Uso administrativo.
        </p>
      </div>

      <div className="max-w-xl space-y-4 rounded-lg border border-secondary/10 bg-white p-5 shadow-sm">
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => void handleArquivo(e.target.files?.[0])}
        />
        <Button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={importarMutation.isPending}
          sx={{
            backgroundColor: 'var(--color-alternate)',
            color: '#fff',
            '&:hover': { backgroundColor: 'rgba(131, 56, 236, 0.85)' },
          }}
        >
          {importarMutation.isPending ? 'Importando...' : 'Selecionar arquivo JSON'}
        </Button>
        {nomeArquivo ? (
          <p className="text-sm text-secondary-text">Arquivo: {nomeArquivo}</p>
        ) : null}
        {importarMutation.isPending ? (
          <div className="flex justify-center py-4">
            <JiffyLoading />
          </div>
        ) : null}
        {resultado ? (
          <div className="space-y-2 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm">
            <p>
              <span className="font-semibold text-alternate">Processados:</span>{' '}
              {resultado.totalProcessados}
            </p>
            <p>
              <span className="font-semibold text-alternate">Inseridos:</span> {resultado.inseridos}
            </p>
            <p>
              <span className="font-semibold text-alternate">Atualizados:</span>{' '}
              {resultado.atualizados}
            </p>
            <p>
              <span className="font-semibold text-alternate">Ignorados:</span> {resultado.ignorados}
            </p>
            {resultado.erros > 0 ? (
              <p className="font-semibold text-red-700">Erros: {resultado.erros}</p>
            ) : (
              <p className="text-green-700">Nenhum erro na importação.</p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
