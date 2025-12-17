'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { Terminal } from '@/src/domain/entities/Terminal'
import { MdPhone, MdEdit, MdPowerSettingsNew, MdSearch } from 'react-icons/md'

/**
 * Tab de Terminais - Lista de terminais carregando todos os itens de uma vez
 * Faz requisições sequenciais de 10 em 10 até carregar tudo
 */
interface TerminalData {
  terminal: Terminal
  rawData: any // Dados brutos da API para campos extras
}

export function TerminaisTab() {
  const { auth } = useAuthStore()
  const [terminais, setTerminais] = useState<TerminalData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [totalItems, setTotalItems] = useState(0)

  const searchQueryRef = useRef('')
  const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined)

  useEffect(() => {
    searchQueryRef.current = searchQuery
  }, [searchQuery])

  /**
   * Carrega todos os terminais fazendo requisições sequenciais
   * Continua carregando páginas de 10 em 10 até não haver mais itens
   */
  const loadAllTerminais = useCallback(
    async () => {
      const token = auth?.getAccessToken()
      if (!token) {
        return
      }

      setIsLoading(true)

      try {
        const allTerminais: TerminalData[] = []
        let currentOffset = 0
        let hasMore = true
        let totalCount = 0

        // Loop para carregar todas as páginas
        while (hasMore) {
          const params = new URLSearchParams({
            limit: '10',
            offset: currentOffset.toString(),
          })

          if (searchQueryRef.current) {
            params.append('q', searchQueryRef.current)
          }

          const response = await fetch(`/api/terminais?${params.toString()}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            const errorMessage = errorData.error || `Erro ${response.status}: ${response.statusText}`
            throw new Error(errorMessage)
          }

          const data = await response.json()

          // Debug: log da resposta da API
          if (process.env.NODE_ENV === 'development') {
            console.log('Resposta da API de terminais:', data)
          }

          // Filtrar e mapear apenas itens válidos, mantendo dados brutos
          const newTerminais = (data.items || [])
            .map((t: any) => {
              try {
                const terminal = Terminal.fromJSON(t)
                return {
                  terminal,
                  rawData: t, // Mantém dados brutos para campos extras
                }
              } catch (error) {
                console.warn('Erro ao criar Terminal:', error, 'Dados:', t)
                return null
              }
            })
            .filter((t: TerminalData | null): t is TerminalData => t !== null)

          allTerminais.push(...newTerminais)

          // Atualiza o total apenas na primeira requisição
          if (currentOffset === 0) {
            totalCount = data.count || data.total || 0
          }

          // Verifica se há mais páginas
          // Se retornou menos de 10 itens, não há mais páginas
          hasMore = newTerminais.length === 10
          currentOffset += newTerminais.length
        }

        setTerminais(allTerminais)
        setTotalItems(totalCount)
      } catch (error) {
        console.error('Erro ao carregar terminais:', error)
      } finally {
        setIsLoading(false)
      }
    },
    [auth]
  )

  // Debounce para busca
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      loadAllTerminais()
    }, 300)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [searchQuery, loadAllTerminais])

  // Carrega dados iniciais
  useEffect(() => {
    loadAllTerminais()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header fixo */}
      <div className="px-4 flex-shrink-0">
        <div className="flex items-center justify-between border-b-2 border-primary/70 pb-2">
          <div className="flex flex-col">
            <span className="text-primary text-2xl font-semibold font-exo">
              Terminais Cadastrados
            </span>
            <span className="text-tertiary text-[20px] font-medium font-nunito">
              Total {terminais.length} de {totalItems}
            </span>
          </div>
          <button
            onClick={() => {
              // TODO: Implementar modal de adicionar terminal
              alert('Funcionalidade de adicionar terminal será implementada')
            }}
            className="h-8 px-4 bg-primary text-info rounded-lg text-sm font-medium font-exo hover:bg-primary/90 transition-colors"
          >
            + Adicionar Terminal
          </button>
        </div>
      </div>

      {/* Busca fixa */}
      <div className="flex gap-3 px-[20px] pb-2 flex-shrink-0">
        <div className="flex-1 min-w-[180px] max-w-[360px]">
          <label
            htmlFor="terminais-search"
            className="text-xs font-semibold text-secondary-text mb-1 block"
          >
            Buscar Terminal...
          </label>
          <div className="relative h-8">
            <MdSearch
              className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-text"
              size={18}
            />
            <input
              id="terminais-search"
              type="text"
              placeholder="Pesquisar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-full pl-11 pr-4 rounded-lg border border-gray-200 bg-info text-primary-text placeholder:text-secondary-text focus:outline-none focus:border-primary text-sm font-nunito"
            />
          </div>
        </div>
      </div>

      {/* Lista de terminais com scroll */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-[20px]">
        {/* Barra de títulos das colunas - sticky dentro do scroll */}
        {terminais.length > 0 && (
          <div className="h-10 bg-custom-2 rounded-lg px-4 flex items-center gap-[10px] sticky top-0 z-10 mb-2">
            <div className="flex-[2] font-nunito font-semibold text-xs text-primary-text uppercase">
              Código do Terminal
            </div>
            <div className="flex-[2] font-nunito font-semibold text-xs text-primary-text uppercase">
              Nome do Terminal
            </div>
            <div className="flex-[2] font-nunito font-semibold text-xs text-primary-text uppercase">
              Modelo Dispositivo
            </div>
            <div className="flex-[1.5] font-nunito font-semibold text-xs text-primary-text uppercase">
              Versão APK
            </div>
            <div className="flex-[1.5] text-center font-nunito font-semibold text-xs text-primary-text uppercase">
              Status
            </div>
            <div className="flex-[1.5] flex justify-end font-nunito font-semibold text-xs text-primary-text uppercase">
              Ações
            </div>
          </div>
        )}

        {terminais.length === 0 && !isLoading && (
          <div className="flex items-center justify-center py-12">
            <p className="text-secondary-text">Nenhum terminal encontrado.</p>
          </div>
        )}

        {terminais.map(({ terminal, rawData }) => {
          // Extrai campos dos dados brutos conforme documentação da API
          const codigo = rawData?.codigoInterno || rawData?.codigo || rawData?.code || terminal.getName() || 'N/A'
          const nome = rawData?.nome || terminal.getName() || codigo
          const modelo = rawData?.modeloDispositivo || rawData?.modelo || rawData?.deviceModel || 'Unknown'
          const versao = rawData?.versaoApk || rawData?.versao || rawData?.apkVersion || rawData?.version || '1.0.0'
          // Status: bloqueado = false significa ATIVO, bloqueado = true significa BLOQUEADO/INATIVO
          const bloqueado = rawData?.bloqueado ?? terminal.getBloqueado()
          const ativo = !bloqueado

          return (
            <div
              key={terminal.getId()}
              className=" px-4 py-2 flex items-center gap-[10px] bg-info rounded-lg my-2 shadow-sm shadow-primary-text/50 hover:bg-primary/10 transition-colors"
            >
              <div className="flex-[2] flex items-center gap-3">
                
                <span className="text-sm font-medium text-primary-text font-nunito">
                 # {codigo}
                </span>
              </div>
              <div className="flex-[2] text-sm text-primary-text font-nunito">
                {nome}
              </div>
              <div className="flex-[2] text-sm text-secondary-text font-nunito">
                {modelo}
              </div>
              <div className="flex-[1.5] text-sm text-secondary-text font-nunito">
                {versao}
              </div>
              <div className="flex-[1.5] flex justify-center">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    ativo
                      ? 'bg-success/20 text-success'
                      : 'bg-error/20 text-error'
                  }`}
                >
                  {ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <div className="flex-[1.5] flex justify-end gap-2">
                <button
                  onClick={() => {
                    // TODO: Implementar edição
                    alert('Funcionalidade de editar terminal será implementada')
                  }}
                  className="w-8 h-8 flex items-center justify-center text-primary hover:bg-primary/10 rounded transition-colors"
                  title="Editar terminal"
                >
                  <MdEdit size={18} />
                </button>
                <button
                  onClick={() => {
                    // TODO: Implementar ativar/desativar
                    alert('Funcionalidade de ativar/desativar terminal será implementada')
                  }}
                  className="w-8 h-8 flex items-center justify-center text-error hover:bg-error/10 rounded transition-colors"
                  title={ativo ? 'Desativar terminal' : 'Ativar terminal'}
                >
                  <MdPowerSettingsNew size={18} />
                </button>
              </div>
            </div>
          )
        })}

        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  )
}

