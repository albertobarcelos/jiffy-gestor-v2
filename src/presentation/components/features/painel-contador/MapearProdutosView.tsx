'use client'

import React, { useEffect, useState } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast } from '@/src/shared/utils/toast'
import { ConfigurarNcmModal } from './ConfigurarNcmModal'
import { HistoricoConfiguracaoNcmModal } from './HistoricoConfiguracaoNcmModal'
import { CopiarConfiguracaoNcmModal } from './CopiarConfiguracaoNcmModal'
import { extractTokenInfo } from '@/src/shared/utils/validateToken'

interface ConfiguracaoImpostoNcm {
  ncm?: {
    codigo: string
    descricao?: string
  }
  cfop?: string
  csosn?: string
  icms?: {
    origem?: number
    cst?: string
    aliquota?: number
  }
  pis?: {
    cst?: string
    aliquota?: number
  }
  cofins?: {
    cst?: string
    aliquota?: number
  }
}

export function MapearProdutosView() {
  const { auth, isRehydrated } = useAuthStore()
  const [configuracoesImpostos, setConfiguracoesImpostos] = useState<ConfiguracaoImpostoNcm[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedConfig, setSelectedConfig] = useState<ConfiguracaoImpostoNcm | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showHistoricoModal, setShowHistoricoModal] = useState(false)
  const [showCopiarModal, setShowCopiarModal] = useState(false)
  const [ncmSelecionado, setNcmSelecionado] = useState<string | null>(null)
  const [regimeTributario, setRegimeTributario] = useState<number | null>(null)

  // Buscar regime tributário da empresa
  useEffect(() => {
    // Aguardar reidratação do Zustand antes de fazer requisições
    if (!isRehydrated) return
    
    const loadRegimeTributario = async () => {
      const token = auth?.getAccessToken()
      if (!token) return

      try {
        const tokenInfo = extractTokenInfo(token)
        const empresaId = tokenInfo?.empresaId
        if (!empresaId) return

        // Segurança: empresaId é extraído do JWT pelo backend
        const response = await fetch(`/api/v1/fiscal/empresas-fiscais/me/todas`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (response.ok) {
          const configs = await response.json()
          if (configs && configs.length > 0) {
            const codigoRegime = configs[0].codigoRegimeTributario
            // Garantir que seja número (pode vir como string da API)
            const regimeNumero = typeof codigoRegime === 'string' 
              ? parseInt(codigoRegime, 10) 
              : codigoRegime
            // Validar se é um número válido (1, 2 ou 3)
            if (regimeNumero === 1 || regimeNumero === 2 || regimeNumero === 3) {
              console.log('[MapearProdutosView] Regime tributário carregado:', regimeNumero)
              setRegimeTributario(regimeNumero)
            } else {
              console.warn('[MapearProdutosView] Regime tributário inválido:', codigoRegime, 'usando default: 1')
              setRegimeTributario(1) // Default: Simples Nacional
            }
          } else {
            console.warn('[MapearProdutosView] Nenhuma configuração encontrada, usando default: 1')
            setRegimeTributario(1) // Default: Simples Nacional
          }
        } else {
          console.warn('[MapearProdutosView] Erro ao buscar regime tributário, usando default: 1')
          setRegimeTributario(1) // Default: Simples Nacional
        }
      } catch (error) {
        console.error('Erro ao buscar regime tributário:', error)
        setRegimeTributario(1) // Default: Simples Nacional
      }
    }

    loadRegimeTributario()
  }, [auth, isRehydrated])

  // Determinar se é Simples Nacional (1 ou 2) ou Regime Normal (3)
  // Se regimeTributario for null, assume Simples Nacional por padrão
  const isSimplesNacional = regimeTributario === null || regimeTributario === 1 || regimeTributario === 2

  useEffect(() => {
    // Aguardar reidratação do Zustand antes de fazer requisições
    if (!isRehydrated) return
    loadConfiguracoesImpostos()
  }, [isRehydrated])

  const loadConfiguracoesImpostos = async () => {
    // Não mostrar toast se ainda não reidratou - pode ser apenas o estado inicial
    if (!isRehydrated) return
    
    const token = auth?.getAccessToken()
    if (!token) {
      // Só mostrar toast se realmente não houver token após reidratação
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/v1/fiscal/configuracoes/ncms/impostos', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao carregar configurações de impostos')
      }

      const result = await response.json()
      setConfiguracoesImpostos(result || [])
    } catch (error: any) {
      console.error('Erro ao carregar configurações:', error)
      showToast.error(error.message || 'Erro ao carregar configurações de impostos')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDoubleClick = (config: ConfiguracaoImpostoNcm) => {
    setSelectedConfig(config)
    setShowModal(true)
  }

  const handleModalClose = () => {
    setShowModal(false)
    setSelectedConfig(null)
  }

  const handleModalSuccess = () => {
    loadConfiguracoesImpostos()
    handleModalClose()
  }

  const handleViewHistorico = (codigoNcm: string) => {
    setNcmSelecionado(codigoNcm)
    setShowHistoricoModal(true)
  }

  const handleCopiarConfiguracao = (codigoNcm: string) => {
    setNcmSelecionado(codigoNcm)
    setShowCopiarModal(true)
  }

  const handleHistoricoModalClose = () => {
    setShowHistoricoModal(false)
    setNcmSelecionado(null)
  }

  const handleCopiarModalClose = () => {
    setShowCopiarModal(false)
    setNcmSelecionado(null)
  }

  const handleCopiarModalSuccess = () => {
    loadConfiguracoesImpostos()
    handleCopiarModalClose()
  }

  const formatarAliquota = (aliquota?: number): string => {
    if (aliquota === undefined || aliquota === null) return '--'
    return `${aliquota.toFixed(2)}%`
  }

  const formatarPisCofins = (pis?: { cst?: string; aliquota?: number }, cofins?: { cst?: string; aliquota?: number }): string => {
    const pisStr = pis?.cst ? `PIS: ${pis.cst}${pis.aliquota ? ` (${formatarAliquota(pis.aliquota)})` : ''}` : ''
    const cofinsStr = cofins?.cst ? `COFINS: ${cofins.cst}${cofins.aliquota ? ` (${formatarAliquota(cofins.aliquota)})` : ''}` : ''
    
    if (pisStr && cofinsStr) {
      return `${pisStr} / ${cofinsStr}`
    } else if (pisStr) {
      return pisStr
    } else if (cofinsStr) {
      return cofinsStr
    }
    return '--'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-secondary-text">Carregando configurações de impostos...</div>
      </div>
    )
  }

  return (
    <>
      <ConfigurarNcmModal
        open={showModal}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        configuracaoImposto={selectedConfig}
      />
      
      {ncmSelecionado && (
        <>
          <HistoricoConfiguracaoNcmModal
            open={showHistoricoModal}
            onClose={handleHistoricoModalClose}
            codigoNcm={ncmSelecionado}
          />
          <CopiarConfiguracaoNcmModal
            open={showCopiarModal}
            onClose={handleCopiarModalClose}
            onSuccess={handleCopiarModalSuccess}
            codigoNcmOrigem={ncmSelecionado}
            todasConfiguracoes={configuracoesImpostos}
          />
        </>
      )}

      <div className="flex flex-col h-full w-full p-6 bg-info">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-secondary-text mb-2">
            Configurações de Impostos por NCM
          </h2>
          <p className="text-sm text-secondary-text/70">
            Configure impostos por NCM. Uma configuração vale para todos os produtos com o mesmo NCM.
          </p>
        </div>

        {configuracoesImpostos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-secondary-text/70 mb-4">
              Nenhuma configuração de impostos cadastrada ainda.
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
                        CFOP
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text uppercase">
                        CSOSN/CST
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text uppercase">
                        PIS/COFINS
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text uppercase">
                        Alíquota ICMS (%)
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text uppercase">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary/10">
                    {configuracoesImpostos.map((config, index) => (
                      <tr
                        key={config.ncm?.codigo || index}
                        onDoubleClick={() => handleDoubleClick(config)}
                        className="hover:bg-secondary/5 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 text-sm text-secondary-text font-mono">
                          {config.ncm?.codigo || '--'}
                        </td>
                        <td className="px-4 py-3 text-sm text-secondary-text font-mono">
                          {config.cfop || '--'}
                        </td>
                        <td className="px-4 py-3 text-sm text-secondary-text">
                          {isSimplesNacional 
                            ? (config.csosn || '--')
                            : (config.icms?.cst || '--')
                          }
                        </td>
                        <td className="px-4 py-3 text-sm text-secondary-text">
                          {formatarPisCofins(config.pis, config.cofins)}
                        </td>
                        <td className="px-4 py-3 text-sm text-secondary-text">
                          {formatarAliquota(config.icms?.aliquota)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            {config.ncm?.codigo && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleViewHistorico(config.ncm!.codigo)
                                  }}
                                  className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                                  title="Ver histórico"
                                >
                                  Histórico
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleCopiarConfiguracao(config.ncm!.codigo)
                                  }}
                                  className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                                  title="Copiar configuração"
                                >
                                  Copiar
                                </button>
                              </>
                            )}
                          </div>
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
