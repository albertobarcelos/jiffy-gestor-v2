'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Complemento } from '@/src/domain/entities/Complemento'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { MdAddCircle, MdOutlineOfflinePin, MdSearch } from 'react-icons/md'
import { showToast } from '@/src/shared/utils/toast'
import {
  ComplementosTabsModal,
  ComplementosTabsModalState,
} from './ComplementosTabsModal'

interface ComplementosListProps {
  onReload?: () => void
}

/**
 * Lista de complementos com scroll infinito
 * Replica exatamente o design e lógica do Flutter
 */
export function ComplementosList({ onReload }: ComplementosListProps) {
  const [complementos, setComplementos] = useState<Complemento[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [filterStatus, setFilterStatus] = useState<'Todos' | 'Ativo' | 'Desativado'>('Ativo')
  const [totalComplementos, setTotalComplementos] = useState(0)
  const [togglingStatus, setTogglingStatus] = useState<Record<string, boolean>>({})
  const [valorInputs, setValorInputs] = useState<Record<string, string>>({})
  const [savingValorMap, setSavingValorMap] = useState<Record<string, boolean>>({})
  const [savingTipoMap, setSavingTipoMap] = useState<Record<string, boolean>>({})
  const [tabsModalState, setTabsModalState] = useState<ComplementosTabsModalState>({
    open: false,
    tab: 'complemento',
    mode: 'create',
    complementoId: undefined,
  })
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const valorDebounceTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const handleValorSubmitRef = useRef<((complementoId: string) => Promise<void>) | null>(null)
  const hasLoadedInitialRef = useRef(false)
  const { auth, isAuthenticated } = useAuthStore()
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  // Refs para evitar dependências desnecessárias no useCallback
  const isLoadingRef = useRef(false)
  const searchTextRef = useRef('')
  const filterStatusRef = useRef<'Todos' | 'Ativo' | 'Desativado'>('Ativo')

  // Atualiza refs quando os valores mudam
  useEffect(() => {
    isLoadingRef.current = isLoading
  }, [isLoading])

  useEffect(() => {
    searchTextRef.current = searchText
  }, [searchText])

  useEffect(() => {
    filterStatusRef.current = filterStatus
  }, [filterStatus])

  const formatValorInput = useCallback((value: string) => {
    // Remove tudo exceto dígitos
    const digits = value.replace(/\D/g, '')
    if (!digits) return 'R$ 0,00'
    const numberValue = parseInt(digits, 10)
    // Formata como moeda brasileira
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(numberValue / 100)
  }, [])

  const formatValorFromNumber = useCallback((value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0)
  }, [])

  const parseValorToNumber = useCallback((value: string) => {
    // Remove R$ e espaços, depois remove pontos (milhares) e substitui vírgula por ponto
    const normalized = value.replace(/R\$/g, '').trim().replace(/\./g, '').replace(',', '.')
    const parsed = parseFloat(normalized)
    return Number.isNaN(parsed) ? 0 : parsed
  }, [])

  const loadComplementos = useCallback(async () => {
    const token = auth?.getAccessToken()
    if (!token || isLoadingRef.current) {
      return
    }

    setIsLoading(true)
    isLoadingRef.current = true

    // Determina o filtro ativo
    let ativoFilter: boolean | null = null
    if (filterStatusRef.current === 'Ativo') {
      ativoFilter = true
    } else if (filterStatusRef.current === 'Desativado') {
      ativoFilter = false
    }

    try {
      const limit = 10
      let currentOffset = 0
      let hasMore = true
      const acumulado: Complemento[] = []
      let totalFromApi: number | null = null

      while (hasMore) {
        const params = new URLSearchParams({
          limit: limit.toString(),
          offset: currentOffset.toString(),
        })

        if (searchTextRef.current) {
          params.append('q', searchTextRef.current)
        }

        if (ativoFilter !== null) {
          params.append('ativo', ativoFilter.toString())
        }

        const response = await fetch(`/api/complementos?${params.toString()}`, {
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

        const newComplementos = (data.items || []).map((item: any) =>
          Complemento.fromJSON(item)
        )

        if (typeof data.count === 'number') {
          totalFromApi = data.count
        }

        acumulado.push(...newComplementos)
        setComplementos([...acumulado])

        if (totalFromApi !== null) {
          setTotalComplementos(totalFromApi)
        }

        currentOffset += newComplementos.length
        hasMore =
          newComplementos.length === limit &&
          (totalFromApi ? currentOffset < totalFromApi : true)

        if (newComplementos.length === 0) {
          hasMore = false
        }
      }

      setComplementos(acumulado)
      setTotalComplementos(totalFromApi ?? acumulado.length)
      if (totalFromApi !== null && totalFromApi !== acumulado.length) {
        setTotalComplementos(acumulado.length)
      }
      setValorInputs(
        acumulado.reduce<Record<string, string>>((acc, item) => {
          acc[item.getId()] = formatValorFromNumber(item.getValor())
          return acc
        }, {})
      )
    } catch (error) {
      console.error('Erro ao carregar complementos:', error)
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }, [auth])

  // Debounce da busca
  useEffect(() => {
    const token = auth?.getAccessToken()
    if (!token) return

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      loadComplementos()
    }, 500)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [searchText, auth, loadComplementos])

  // Recarrega ao trocar filtro de status
  useEffect(() => {
    const token = auth?.getAccessToken()
    if (!token) return

    loadComplementos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus])

  // Carrega complementos iniciais apenas quando o token estiver disponível
  useEffect(() => {
    if (!isAuthenticated || hasLoadedInitialRef.current) return

    const token = auth?.getAccessToken()
    if (!token) return

    hasLoadedInitialRef.current = true
    loadComplementos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  // Limpa todos os timers de debounce ao desmontar o componente
  useEffect(() => {
    return () => {
      valorDebounceTimersRef.current.forEach((timer) => {
        clearTimeout(timer)
      })
      valorDebounceTimersRef.current.clear()
    }
  }, [])

  const handleStatusChange = () => {
    loadComplementos()
    onReload?.()
  }

  const openTabsModal = useCallback((config: Partial<ComplementosTabsModalState> = {}) => {
    setTabsModalState(() => ({
      open: true,
      tab: config.tab ?? 'complemento',
      mode: config.mode ?? 'create',
      complementoId: config.complementoId,
    }))

    // Adicionar um parâmetro na URL para forçar o recarregamento ao fechar o modal
    const currentSearchParams = new URLSearchParams(Array.from(searchParams.entries()))
    currentSearchParams.set('modalComplementoOpen', 'true')
    router.replace(`${pathname}?${currentSearchParams.toString()}`, { scroll: false })
  }, [router, searchParams, pathname])

  const closeTabsModal = useCallback(() => {
    setTabsModalState((prev) => ({
      ...prev,
      open: false,
      complementoId: undefined,
    }))

    // Remover o parâmetro da URL para forçar o recarregamento da rota
    const currentSearchParams = new URLSearchParams(Array.from(searchParams.entries()))
    currentSearchParams.delete('modalComplementoOpen')
    router.replace(`${pathname}?${currentSearchParams.toString()}`, { scroll: false })
    router.refresh() // Força a revalidação da rota principal
    loadComplementos() // Recarrega a lista de complementos
    onReload?.()
  }, [router, searchParams, pathname, loadComplementos, onReload])

  const handleTabsModalReload = useCallback(() => {
    loadComplementos()
    onReload?.()
  }, [loadComplementos, onReload])

  const handleTabsModalTabChange = useCallback((tab: 'complemento') => {
    setTabsModalState((prev) => ({
      ...prev,
      tab,
    }))
  }, [])

  const handleToggleComplementoStatus = useCallback(
    async (complemento: Complemento, novoStatus: boolean) => {
      const token = auth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado. Faça login novamente.')
        return
      }

      const complementoId = complemento.getId()
      const previousComplementos = complementos

      setTogglingStatus((prev) => ({ ...prev, [complementoId]: true }))
      setComplementos((prev) =>
        prev.map((item) =>
          item.getId() === complementoId
            ? Complemento.create(
                item.getId(),
                item.getNome(),
                item.getDescricao(),
                item.getValor(),
                novoStatus,
                item.getTipoImpactoPreco(),
                item.getOrdem()
              )
            : item
        )
      )

      try {
        const response = await fetch(`/api/complementos/${complementoId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ativo: novoStatus }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || 'Erro ao atualizar complemento')
        }

        showToast.success(
          novoStatus ? 'Complemento ativado com sucesso!' : 'Complemento desativado com sucesso!'
        )
        await loadComplementos()
        onReload?.()
      } catch (error: any) {
        console.error('Erro ao atualizar status do complemento:', error)
        showToast.error(error.message || 'Erro ao atualizar status do complemento')
        setComplementos([...previousComplementos])
      } finally {
        setTogglingStatus((prev) => {
          const { [complementoId]: _, ...rest } = prev
          return rest
        })
      }
    },
    [auth, complementos, loadComplementos, onReload]
  )

  const clearValorDebounceTimer = useCallback((complementoId: string) => {
    const timer = valorDebounceTimersRef.current.get(complementoId)
    if (timer) {
      clearTimeout(timer)
      valorDebounceTimersRef.current.delete(complementoId)
    }
  }, [])

  const handleValorInputChange = useCallback(
    (complementoId: string, value: string) => {
      setValorInputs((prev) => ({
        ...prev,
        [complementoId]: formatValorInput(value),
      }))

      // Limpa o timer anterior se existir
      clearValorDebounceTimer(complementoId)

      // Cria um novo timer para salvar automaticamente após 2 segundos
      const timer = setTimeout(() => {
        if (handleValorSubmitRef.current) {
          handleValorSubmitRef.current(complementoId)
        }
        valorDebounceTimersRef.current.delete(complementoId)
      }, 2000)

      valorDebounceTimersRef.current.set(complementoId, timer)
    },
    [formatValorInput, clearValorDebounceTimer]
  )

  const handleValorSubmit = useCallback(
    async (complementoId: string) => {
      // Limpa o timer de debounce se existir
      clearValorDebounceTimer(complementoId)

      const token = auth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado. Faça login novamente.')
        return
      }

      const valorString = valorInputs[complementoId]
      const novoValor = parseValorToNumber(valorString ?? '')
      if (Number.isNaN(novoValor)) {
        showToast.error('Informe um valor válido.')
        return
      }

      const complementoAtual = complementos.find((item) => item.getId() === complementoId)
      if (!complementoAtual) {
        showToast.error('Complemento não encontrado.')
        return
      }

      if (novoValor === complementoAtual.getValor()) {
        return
      }

      setSavingValorMap((prev) => ({ ...prev, [complementoId]: true }))

      try {
        const response = await fetch(`/api/complementos/${complementoId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ valor: novoValor }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || 'Erro ao atualizar valor')
        }

        showToast.success('Valor atualizado com sucesso!')
        setComplementos((prev) =>
          prev.map((item) =>
            item.getId() === complementoId
              ? Complemento.create(
                  item.getId(),
                  item.getNome(),
                  item.getDescricao(),
                  novoValor,
                  item.isAtivo(),
                  item.getTipoImpactoPreco(),
                  item.getOrdem()
                )
              : item
          )
        )
      } catch (error: any) {
        console.error('Erro ao atualizar valor do complemento:', error)
        showToast.error(error.message || 'Erro ao atualizar valor do complemento')
        setValorInputs((prev) => ({
          ...prev,
          [complementoId]: formatValorFromNumber(complementoAtual.getValor()),
        }))
      } finally {
        setSavingValorMap((prev) => {
          const { [complementoId]: _, ...rest } = prev
          return rest
        })
      }
    },
    [auth, valorInputs, parseValorToNumber, complementos, formatValorFromNumber, clearValorDebounceTimer]
  )

  // Atualiza a ref quando handleValorSubmit mudar
  useEffect(() => {
    handleValorSubmitRef.current = handleValorSubmit
  }, [handleValorSubmit])

  const handleTipoImpactoChange = useCallback(
    async (complementoId: string, novoTipo: 'nenhum' | 'aumenta' | 'diminui') => {
      const token = auth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado. Faça login novamente.')
        return
      }

      const complementoAtual = complementos.find((item) => item.getId() === complementoId)
      if (!complementoAtual) {
        showToast.error('Complemento não encontrado.')
        return
      }

      const tipoAtual = (complementoAtual.getTipoImpactoPreco() || 'nenhum').toLowerCase()
      if (tipoAtual === novoTipo) {
        return
      }

      setSavingTipoMap((prev) => ({ ...prev, [complementoId]: true }))

      try {
        const payloadTipo = novoTipo.toLowerCase()
        const response = await fetch(`/api/complementos/${complementoId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ tipoImpactoPreco: payloadTipo }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || 'Erro ao atualizar tipo de impacto')
        }

        showToast.success('Tipo de impacto atualizado com sucesso!')
        setComplementos((prev) =>
          prev.map((item) =>
            item.getId() === complementoId
              ? Complemento.create(
                  item.getId(),
                  item.getNome(),
                  item.getDescricao(),
                  item.getValor(),
                  item.isAtivo(),
                  payloadTipo,
                  item.getOrdem()
                )
              : item
          )
        )
      } catch (error: any) {
        console.error('Erro ao atualizar tipo de impacto:', error)
        showToast.error(error.message || 'Erro ao atualizar tipo de impacto')
      } finally {
        setSavingTipoMap((prev) => {
          const { [complementoId]: _, ...rest } = prev
          return rest
        })
      }
    },
    [auth, complementos]
  )

  return (
    <div className="flex flex-col h-full">
      {/* Header com título e botão */}
      <div className="px-[30px] py-2 flex-shrink-0">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[220px] flex-1 pl-5">
            <p className="text-primary text-sm font-semibold font-nunito">
              Complementos Cadastrados
            </p>
            <p className="text-tertiary text-[22px] font-medium font-nunito">
              Total {complementos.length} de {totalComplementos}
            </p>
          </div>
          <button
            onClick={() =>
              openTabsModal({
                mode: 'create',
                complementoId: undefined,
              })
            }
            className="h-8 px-[30px] bg-primary text-info rounded-lg font-semibold font-exo text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors"
          >
            Novo
            <span className="text-lg">+</span>
          </button>
        </div>
      </div>

      <div className="h-[4px] border-t-2 border-primary/70 flex-shrink-0"></div>
      <div className="flex gap-3 px-[20px] flex-shrink-0">
        <div className="flex-1 min-w-[180px] max-w-[360px]">
            <label
              htmlFor="complementos-search"
              className="text-xs font-semibold text-secondary-text mb-1 block"
            >
              Buscar complemento...
            </label>
            <div className="relative h-8">
              <MdSearch
                className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-text"
                size={18}
              />
              <input
                id="complementos-search"
                type="text"
                placeholder="Pesquisar complemento..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full h-full pl-11 pr-4 rounded-lg border border-gray-200 bg-info text-primary-text placeholder:text-secondary-text focus:outline-none focus:border-primary text-sm font-nunito"
              />
            </div>
          </div>

          <div className="w-full sm:w-[160px]">
            <label className="text-xs font-semibold text-secondary-text mb-1 block">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(e.target.value as 'Todos' | 'Ativo' | 'Desativado')
              }
              className="w-full h-8 px-5 rounded-lg border border-gray-200 bg-info text-primary-text focus:outline-none focus:border-primary text-sm font-nunito"
            >
              <option value="Todos">Todos</option>
              <option value="Ativo">Ativo</option>
              <option value="Desativado">Desativado</option>
            </select>
          </div>
          </div>

      {/* Cabeçalho da tabela */}
      <div className="px-[30px] py-2 flex-shrink-0">
        <div className="h-10 bg-custom-2 rounded-lg px-4 flex items-center gap-[10px]">
          <div className="flex-[3] font-nunito font-semibold text-sm text-primary-text">
            Nome
          </div>
          <div className="flex-[3] font-nunito font-semibold text-sm text-primary-text">
            Descrição
          </div>
          <div className="flex-[2] font-nunito font-semibold text-sm text-primary-text">
            Valor
          </div>
          <div className="flex-1 font-nunito font-semibold text-sm text-primary-text text-center">
            Tipo Impacto
          </div>
          <div className="flex-[2] text-center font-nunito font-semibold text-sm text-primary-text">
            Status
          </div>
        </div>
      </div>

      {/* Lista de complementos com scroll */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-[30px] mt-2 scrollbar-hide"
        style={{ maxHeight: 'calc(100vh - 300px)' }}
      >
        {complementos.length === 0 && !isLoading && (
          <div className="flex items-center justify-center py-12">
            <p className="text-secondary-text">Nenhum complemento encontrado.</p>
          </div>
        )}

        {complementos.map((complemento) => {
          // Handler para abrir edição ao clicar na linha
          const handleRowClick = () => {
            openTabsModal({
              mode: 'edit',
              complementoId: complemento.getId(),
            })
          }

          return (
          <div
            key={complemento.getId()}
            onClick={handleRowClick}
            className=" bg-info rounded-lg px-4 mb-2 flex items-center gap-[10px] shadow-xl hover:shadow-md transition-shadow hover:bg-secondary-bg/15 cursor-pointer"
          >
            <div className="flex-[3] font-nunito font-semibold text-sm text-primary-text flex items-center gap-1">
              <span># {complemento.getNome()}</span>
            </div>
            <div className="flex-[3] font-nunito text-sm text-secondary-text">
              {complemento.getDescricao() || 'Nenhuma'}
            </div>

            <div className="flex-[2]" onClick={(e) => e.stopPropagation()}>
              <div className="flex flex-col mt-2 items-start gap-1">
                 <div className="flex items-center justify-end gap-2 px-3 py-1 rounded-lg border border-gray-300 bg-white max-w-[140px]">
                 
                   <input
                    type="text"
                    value={
                      valorInputs[complemento.getId()] ??
                      formatValorFromNumber(complemento.getValor())
                    }
                    onChange={(e) => handleValorInputChange(complemento.getId(), e.target.value)}
                    onFocus={(e) => e.target.select()}
                    onBlur={() => handleValorSubmit(complemento.getId())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleValorSubmit(complemento.getId())
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    disabled={!!savingValorMap[complemento.getId()]}
                    className={`w-full bg-transparent text-left text-sm font-semibold text-primary-text focus:outline-none ${
                      savingValorMap[complemento.getId()] ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  />
                </div>
                <span className="text-xs text-secondary-text font-semibold mb-2">
                  R$ {complemento.getValor().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="flex-1 font-nunito text-sm text-secondary-text text-center" onClick={(e) => e.stopPropagation()}>
              <select
                value={(complemento.getTipoImpactoPreco() || 'nenhum').toLowerCase()}
                onChange={(e) =>
                  handleTipoImpactoChange(
                    complemento.getId(),
                    e.target.value as 'nenhum' | 'aumenta' | 'diminui'
                  )
                }
                onClick={(e) => e.stopPropagation()}
                disabled={!!savingTipoMap[complemento.getId()]}
                className={`w-full px-0 py-1 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-primary-text focus:outline-none focus:border-primary text-center ${
                  savingTipoMap[complemento.getId()] ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                <option value="nenhum">Nenhum</option>
                <option value="aumenta">Aumenta</option>
                <option value="diminui">Diminui</option>
              </select>
            </div>
            <div className="flex-[2] flex justify-center" onClick={(e) => e.stopPropagation()}>
              <label
                className={`relative inline-flex h-5 w-12 items-center ${
                  togglingStatus[complemento.getId()]
                    ? 'cursor-not-allowed opacity-60'
                    : 'cursor-pointer'
                }`}
                title={complemento.isAtivo() ? 'Complemento Ativo' : 'Complemento Desativado'}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={complemento.isAtivo()}
                  onChange={(event) => {
                    event.stopPropagation()
                    handleToggleComplementoStatus(complemento, event.target.checked)
                  }}
                  onClick={(e) => e.stopPropagation()}
                  disabled={!!togglingStatus[complemento.getId()]}
                />
                <div className="h-full w-full rounded-full bg-gray-300 transition-colors peer-checked:bg-primary" />
                <span className="absolute left-1 top-1/2 block h-3 w-3 -translate-y-1/2 rounded-full bg-white shadow transition-transform duration-200 peer-checked:translate-x-6" />
              </label>
            </div>
          </div>
          )
        })}

        {isLoading && (
          <div className="flex justify-center py-4">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      <ComplementosTabsModal
        state={tabsModalState}
        onClose={closeTabsModal}
        onReload={handleTabsModalReload}
        onTabChange={handleTabsModalTabChange}
      />
    </div>
  )
}


