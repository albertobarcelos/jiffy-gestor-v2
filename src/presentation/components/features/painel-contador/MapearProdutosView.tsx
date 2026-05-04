'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast } from '@/src/shared/utils/toast'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { ConfigurarNcmModal } from './ConfigurarNcmModal'
import { HistoricoConfiguracaoNcmModal } from './HistoricoConfiguracaoNcmModal'
import { CopiarConfiguracaoNcmModal } from './CopiarConfiguracaoNcmModal'

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

function mapNcmToConfiguracaoImposto(item: unknown): ConfiguracaoImpostoNcm | null {
  if (!item || typeof item !== 'object') return null

  const itemData = item as {
    codigo?: string
    descricao?: string
    impostos?: {
      cfop?: string
      csosn?: string
      icms?: ConfiguracaoImpostoNcm['icms']
      pis?: ConfiguracaoImpostoNcm['pis']
      cofins?: ConfiguracaoImpostoNcm['cofins']
    }
  }

  if (!itemData.codigo) return null

  // NCM sem configuração de impostos também deve aparecer na listagem
  // para permitir configuração manual pela UI.
  const impostos = itemData.impostos ?? {}

  return {
    ncm: {
      codigo: itemData.codigo,
      descricao: itemData.descricao,
    },
    cfop: impostos.cfop,
    csosn: impostos.csosn,
    icms: impostos.icms,
    pis: impostos.pis,
    cofins: impostos.cofins,
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
  /** Mobile: linhas expandidas na lista em cards (chave = código NCM ou índice) */
  const [ncmExpandidoMobile, setNcmExpandidoMobile] = useState<Record<string, boolean>>({})
  /** Mobile: duplo toque na área do NCM para abrir o modal (onDoubleClick nem sempre dispara bem no touch) */
  const ultimoToqueNcmMobileRef = useRef<{ ncm: string; timestamp: number } | null>(null)

  // Buscar regime tributário da empresa
  useEffect(() => {
    // Aguardar reidratação do Zustand antes de fazer requisições
    if (!isRehydrated) return
    
    const loadRegimeTributario = async () => {
      const token = auth?.getAccessToken()
      if (!token) return

      try {
        const response = await fetch('/api/v1/fiscal/empresas-fiscais/me', {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (response.ok) {
          const config = await response.json()
          const codigoRegime = config?.codigoRegimeTributario
          const regimeNumero =
            typeof codigoRegime === 'string'
              ? parseInt(codigoRegime, 10)
              : codigoRegime

          if (regimeNumero === 1 || regimeNumero === 2 || regimeNumero === 3) {
            setRegimeTributario(regimeNumero)
          } else {
            setRegimeTributario(1) // Default: Simples Nacional
          }
        } else {
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
      const response = await fetch('/api/v1/fiscal/configuracoes/ncms?page=0&size=1000', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao carregar configurações de impostos')
      }

      const result = await response.json()
      const content: unknown[] = Array.isArray(result?.content) ? result.content : []
      const configuracoes = content
        .map(mapNcmToConfiguracaoImposto)
        .filter((item: ConfiguracaoImpostoNcm | null): item is ConfiguracaoImpostoNcm => item !== null)

      setConfiguracoesImpostos(configuracoes)
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

  const handleToqueNcmMobile = (config: ConfiguracaoImpostoNcm) => {
    const codigoNcm = config.ncm?.codigo
    if (!codigoNcm) return

    const agora = Date.now()
    const ultimo = ultimoToqueNcmMobileRef.current
    const duploToque = ultimo?.ncm === codigoNcm && agora - ultimo.timestamp <= 350

    if (duploToque) {
      handleDoubleClick(config)
      ultimoToqueNcmMobileRef.current = null
      return
    }

    ultimoToqueNcmMobileRef.current = { ncm: codigoNcm, timestamp: agora }
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

  const chaveLinhaNcm = (config: ConfiguracaoImpostoNcm, index: number) =>
    config.ncm?.codigo ?? `row-${index}`

  const toggleDetalhesMobile = (key: string) => {
    setNcmExpandidoMobile(prev => ({ ...prev, [key]: !prev[key] }))
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
        <JiffyLoading />
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

      <div className="flex flex-col h-full w-full md:p-6 p-2 bg-info">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-alternate mb-2">
            Configurações de Impostos por NCM
          </h2>
          <p className="text-sm text-secondary-text">
            Configure impostos por NCM. Uma configuração vale para todos os produtos com o mesmo NCM.
          </p>
        </div>

        {configuracoesImpostos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-alternate mb-4">
              Nenhuma configuração de impostos cadastrada ainda.
            </p>
            <p className="text-sm text-alternate">
              As configurações aparecerão aqui quando forem criadas.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            {/* Desktop: tabela completa */}
            <div className="hidden bg-white rounded-lg shadow-sm border border-secondary/10 md:block">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-alternate/10">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-alternate uppercase">
                        NCM
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-alternate uppercase">
                        CFOP
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-alternate uppercase">
                        CSOSN/CST
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-alternate uppercase">
                        PIS/COFINS
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-alternate uppercase">
                        Alíquota ICMS (%)
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-alternate uppercase">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {configuracoesImpostos.map((config, index) => (
                      <tr
                        key={config.ncm?.codigo || index}
                        onDoubleClick={() => handleDoubleClick(config)}
                        className={`hover:bg-alternate/10 cursor-pointer transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-alternate/5'
                        }`}
                      >
                        <td className="px-4 py-3 text-sm text-secondary-text font-mono">
                          {config.ncm?.codigo || '--'}
                        </td>
                        <td className="px-4 py-3 text-sm text-secondary-text font-mono">
                          {config.cfop || '--'}
                        </td>
                        <td className="px-4 py-3 text-sm text-secondary-text">
                          {isSimplesNacional
                            ? config.csosn || '--'
                            : config.icms?.cst || '--'}
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
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation()
                                    handleViewHistorico(config.ncm!.codigo)
                                  }}
                                  className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                                  title="Ver histórico"
                                >
                                  Histórico
                                </button>
                                <button
                                  type="button"
                                  onClick={e => {
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

            {/* Mobile: só NCM + Exibir; detalhes em coluna única ao expandir */}
            <div className="space-y-2 md:hidden">
              {configuracoesImpostos.map((config, index) => {
                const key = chaveLinhaNcm(config, index)
                const expandido = Boolean(ncmExpandidoMobile[key])
                const csosnOuCst = isSimplesNacional
                  ? config.csosn || '--'
                  : config.icms?.cst || '--'

                return (
                  <div
                    key={key}
                    className={`rounded-lg border border-secondary/10 bg-white p-3 shadow-sm ${
                      index % 2 === 1 ? 'bg-alternate/5' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className="min-w-0 flex-1 cursor-pointer"
                        onDoubleClick={() => handleDoubleClick(config)}
                        onClick={() => handleToqueNcmMobile(config)}
                        title="Duplo toque/clique no NCM para configurar"
                      >
                        <p className="text-xs font-semibold uppercase text-alternate">NCM</p>
                        <p className="break-all font-mono text-base font-medium text-secondary-text">
                          {config.ncm?.codigo || '--'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleDetalhesMobile(key)}
                        className="shrink-0 rounded border border-alternate/40 px-2.5 py-1 text-xs font-medium text-alternate hover:bg-alternate/10"
                      >
                        {expandido ? 'Ocultar' : 'Exibir'}
                      </button>
                    </div>

                    {expandido && (
                      <div className="mt-3 space-y-2 border-t border-gray-200 pt-3 text-sm text-secondary-text">
                        <div className="break-words">
                          <span className="font-semibold text-alternate">CFOP:</span>{' '}
                          <span className="text-secondary-text/90">{config.cfop || '--'}</span>
                        </div>
                        <div className="break-words">
                          <span className="font-semibold text-alternate">
                            {isSimplesNacional ? 'CSOSN:' : 'CST ICMS:'}
                          </span>{' '}
                          <span className="text-secondary-text/90">{csosnOuCst}</span>
                        </div>
                        <div className="break-words">
                          <span className="font-semibold text-alternate">PIS:</span>{' '}
                          <span className="text-secondary-text/90">
                            {config.pis?.cst
                              ? `${config.pis.cst}${config.pis.aliquota != null ? ` (${formatarAliquota(config.pis.aliquota)})` : ''}`
                              : '--'}
                          </span>
                        </div>
                        <div className="break-words">
                          <span className="font-semibold text-alternate">COFINS:</span>{' '}
                          <span className="text-secondary-text/90">
                            {config.cofins?.cst
                              ? `${config.cofins.cst}${config.cofins.aliquota != null ? ` (${formatarAliquota(config.cofins.aliquota)})` : ''}`
                              : '--'}
                          </span>
                        </div>
                        <div className="break-words">
                          <span className="font-semibold text-alternate">Alíquota ICMS (%):</span>{' '}
                          <span className="text-secondary-text/90">
                            {formatarAliquota(config.icms?.aliquota)}
                          </span>
                        </div>
                        {config.ncm?.codigo && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleViewHistorico(config.ncm!.codigo)}
                              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                            >
                              Histórico
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopiarConfiguracao(config.ncm!.codigo)}
                              className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                            >
                              Copiar
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="mt-4 text-sm text-secondary-text/70">
              <p className="hidden md:block">💡 Dica: Dê duplo clique em um NCM para configurá-lo</p>
              <p className="md:hidden">
                💡 Dica: toque duas vezes no código NCM para abrir a configuração; use Exibir para ver CFOP e
                impostos.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
