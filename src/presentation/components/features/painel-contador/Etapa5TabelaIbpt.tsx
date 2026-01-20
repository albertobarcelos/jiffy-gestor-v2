'use client'

import React, { useEffect, useState } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast } from '@/src/shared/utils/toast'
import { Button } from '@/src/presentation/components/ui/button'
import { MdCheckCircle, MdError, MdUpload } from 'react-icons/md'

interface StatusTabelaIbpt {
  ultimaImportacao?: string
  totalRegistros: number
  registrosVigentes: number
}

export function Etapa5TabelaIbpt() {
  const { auth, isRehydrated } = useAuthStore()
  const [isLoading, setIsLoading] = useState(true)
  const [isImporting, setIsImporting] = useState(false)
  const [status, setStatus] = useState<StatusTabelaIbpt | null>(null)
  const [file, setFile] = useState<File | null>(null)

  useEffect(() => {
    // Aguardar reidratação do Zustand antes de fazer requisições
    if (!isRehydrated) return
    loadStatus()
  }, [isRehydrated])

  const loadStatus = async () => {
    if (!isRehydrated) return
    const token = auth?.getAccessToken()
    if (!token) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/v1/fiscal/tabela-ibpt/status', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      }
    } catch (error) {
      console.error('Erro ao carregar status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleImport = async () => {
    if (!file) {
      showToast.error('Selecione um arquivo para importar')
      return
    }

    const token = auth?.getAccessToken()
    if (!token) {
      showToast.error('Sessão expirada. Faça login novamente.')
      return
    }

    setIsImporting(true)
    const toastId = showToast.loading('Importando Tabela IBPT...')

    try {
      // Ler arquivo como texto
      const text = await file.text()
      
      // Validar JSON
      const dados = JSON.parse(text)
      if (!Array.isArray(dados)) {
        throw new Error('Arquivo deve conter um array de registros')
      }

      const response = await fetch('/api/v1/fiscal/tabela-ibpt/importar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ dadosJson: text }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao importar Tabela IBPT')
      }

      showToast.successLoading(toastId, 'Tabela IBPT importada com sucesso!')
      setFile(null)
      await loadStatus()
    } catch (error: any) {
      console.error('Erro ao importar:', error)
      showToast.errorLoading(toastId, error.message || 'Erro ao importar Tabela IBPT')
    } finally {
      setIsImporting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-secondary-text">Carregando status...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-primary/20 bg-white p-4">
        <h4 className="font-exo font-semibold text-primary text-lg mb-4">
          Tabela IBPT (Impostos Básicos sobre Produtos e Serviços)
        </h4>

        {status && status.totalRegistros > 0 ? (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <MdCheckCircle className="text-green-600" size={20} />
              <span className="font-inter font-medium text-green-800 text-sm">
                Tabela IBPT importada
              </span>
            </div>
            <div className="text-sm text-green-700 space-y-1">
              <p>Total de registros: {status.totalRegistros.toLocaleString('pt-BR')}</p>
              <p>Registros vigentes: {status.registrosVigentes.toLocaleString('pt-BR')}</p>
              {status.ultimaImportacao && (
                <p>Última importação: {new Date(status.ultimaImportacao).toLocaleString('pt-BR')}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <MdError className="text-yellow-600" size={20} />
              <span className="font-inter font-medium text-yellow-800 text-sm">
                Tabela IBPT não importada
              </span>
            </div>
            <p className="text-sm text-yellow-700">
              Importe a Tabela IBPT para utilizar os dados de impostos atualizados.
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-text mb-2">
              Selecionar arquivo JSON
            </label>
            <input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="block w-full text-sm text-secondary-text file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-secondary file:text-white hover:file:bg-alternate"
              disabled={isImporting}
            />
            <p className="text-xs text-secondary-text/70 mt-1">
              Arquivo JSON com array de registros da Tabela IBPT
            </p>
          </div>

          <Button
            onClick={handleImport}
            disabled={!file || isImporting}
            className="rounded-lg px-4 py-2 text-white text-sm font-medium"
            sx={{
              backgroundColor: 'var(--color-secondary)',
              '&:hover': { backgroundColor: 'var(--color-alternate)' },
              '&:disabled': { backgroundColor: '#ccc', cursor: 'not-allowed' },
            }}
          >
            <MdUpload className="mr-2" size={16} />
            {isImporting ? 'Importando...' : 'Importar Tabela IBPT'}
          </Button>
        </div>
      </div>
    </div>
  )
}
