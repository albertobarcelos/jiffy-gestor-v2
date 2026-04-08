'use client'

import React, { useEffect, useState } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast } from '@/src/shared/utils/toast'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { ConfigurarReformaTributariaModal } from './ConfigurarReformaTributariaModal'

interface ConfiguracaoReformaTributaria {
  id: string
  ncm?: {
    codigo: string
    descricao?: string
  }
  cst?: string
  codigoClassificacaoFiscal?: string
}

export function ReformaTributariaView() {
  const { auth, isRehydrated } = useAuthStore()
  const [configuracoes, setConfiguracoes] = useState<ConfiguracaoReformaTributaria[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedConfig, setSelectedConfig] = useState<ConfiguracaoReformaTributaria | null>(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    // Aguardar reidratação do Zustand antes de fazer requisições
    if (!isRehydrated) return
    loadConfiguracoes()
  }, [isRehydrated])

  const loadConfiguracoes = async () => {
    // Não mostrar toast se ainda não reidratou - pode ser apenas o estado inicial
    if (!isRehydrated) return
    
    const token = auth?.getAccessToken()
    if (!token) {
      // Só mostrar toast se realmente não houver token após reidratação
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/v1/fiscal/configuracoes/ncms/reforma-tributaria', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao carregar configurações de Reforma Tributária')
      }

      const data = await response.json()
      setConfiguracoes(data || [])
    } catch (error: any) {
      console.error('Erro ao carregar configurações:', error)
      showToast.error(error.message || 'Erro ao carregar configurações de Reforma Tributária')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDoubleClick = (config: ConfiguracaoReformaTributaria) => {
    setSelectedConfig(config)
    setShowModal(true)
  }

  const handleModalClose = () => {
    setShowModal(false)
    setSelectedConfig(null)
  }

  const handleModalSuccess = () => {
    loadConfiguracoes()
    handleModalClose()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <JiffyLoading />
      </div>
    )
  }

  return (
    <>
      <ConfigurarReformaTributariaModal
        open={showModal}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        configuracao={selectedConfig}
      />

      <div className="flex flex-col h-full w-full p-6 bg-info">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-secondary-text mb-2">
            Reforma Tributária - Configurações por NCM
          </h2>
          <p className="text-sm text-secondary-text/70">
            Configure os códigos de Reforma Tributária por NCM. Uma configuração vale para todos os produtos com o mesmo NCM.
          </p>
        </div>

        {configuracoes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-secondary-text/70 mb-4">
              Nenhuma configuração de Reforma Tributária cadastrada ainda.
            </p>
            <p className="text-sm text-secondary-text/50">
              As configurações aparecerão aqui quando forem criadas.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <div className="bg-white rounded-lg shadow-sm border border-secondary/10">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-secondary/5">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text uppercase">
                        NCM
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text uppercase">
                        CST
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text uppercase">
                        Código Classificação Fiscal
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary/10">
                    {configuracoes.map((config, index) => (
                      <tr
                        key={config.id || config.ncm?.codigo || index}
                        onDoubleClick={() => handleDoubleClick(config)}
                        className="hover:bg-secondary/5 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 text-sm text-secondary-text font-mono">
                          {config.ncm?.codigo || '--'}
                        </td>
                        <td className="px-4 py-3 text-sm text-secondary-text">
                          {config.cst || '--'}
                        </td>
                        <td className="px-4 py-3 text-sm text-secondary-text">
                          {config.codigoClassificacaoFiscal || '--'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-4 text-sm text-secondary-text/70">
              <p>💡 Dica: Dê duplo clique em um NCM para configurá-lo</p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
