'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Complemento } from '@/src/domain/entities/Complemento'
import { ComplementoActionsMenu } from './ComplementoActionsMenu'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { MdAddCircle, MdModeEdit, MdOutlineOfflinePin, MdSearch } from 'react-icons/md'
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
  const hasLoadedInitialRef = useRef(false)
  const { auth, isAuthenticated } = useAuthStore()

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
    const digits = value.replace(/\D/g, '')
    if (!digits) return ''
    const numberValue = parseInt(digits, 10)
    return (numberValue / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
      .replace(/^R\$\s?/, '')
  }, [])

  const formatValorFromNumber = useCallback((value: number) => {
    return (value || 0)
      .toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
      .replace(/^R\$\s?/, '')
  }, [])

  const parseValorToNumber = useCallback((value: string) => {
    const normalized = value.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')
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
  }, [])

  const closeTabsModal = useCallback(() => {
    setTabsModalState((prev) => ({
      ...prev,
      open: false,
      complementoId: undefined,
    }))
  }, [])

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

  const handleValorInputChange = useCallback(
    (complementoId: string, value: string) => {
      setValorInputs((prev) => ({
        ...prev,
        [complementoId]: formatValorInput(value),
      }))
    },
    [formatValorInput]
  )

  const handleValorSubmit = useCallback(
    async (complementoId: string) => {
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
    [auth, valorInputs, parseValorToNumber, complementos, formatValorFromNumber]
  )

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
      <div className="px-[30px] py-2">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[220px] flex-1 pl-5">
            <p className="text-primary text-sm font-semibold font-nunito">
              Complementos Cadastrados
            </p>
            <p className="text-tertiary text-[26px] font-medium font-nunito">
              Total {complementos.length} de {totalComplementos}
            </p>
          </div>

          <div className="flex-[2] min-w-[280px]">
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
                className="w-full h-full pl-11 pr-4 rounded-[24px] border border-gray-200 bg-info text-primary-text placeholder:text-secondary-text focus:outline-none focus:border-primary text-sm font-nunito"
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
              className="w-full h-8 px-5 rounded-[24px] border border-gray-200 bg-info text-primary-text focus:outline-none focus:border-primary text-sm font-nunito"
            >
              <option value="Todos">Todos</option>
              <option value="Ativo">Ativo</option>
              <option value="Desativado">Desativado</option>
            </select>
          </div>

          <button
            onClick={() =>
              openTabsModal({
                mode: 'create',
                complementoId: undefined,
              })
            }
            className="h-10 px-[30px] bg-primary text-info rounded-[30px] font-semibold font-exo text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors"
          >
            Novo
            <span className="text-lg">+</span>
          </button>
        </div>
      </div>

      <div className="h-[4px] border-t-2 border-alternate"></div>

      {/* Cabeçalho da tabela */}
      <div className="px-[30px] mt-4">
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
          <div className="flex-1 text-right font-nunito font-semibold text-sm text-primary-text">
            Ações
          </div>
        </div>
      </div>

      {/* Lista de complementos com scroll */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-[30px] mt-2"
      >
        {complementos.length === 0 && !isLoading && (
          <div className="flex items-center justify-center py-12">
            <p className="text-secondary-text">Nenhum complemento encontrado.</p>
          </div>
        )}

        {complementos.map((complemento) => (
          <div
            key={complemento.getId()}
            className=" bg-info rounded-xl px-4 mb-2 flex items-center gap-[10px] shadow-xl hover:shadow-md transition-shadow hover:bg-secondary-bg/15"
          >
            <div className="flex-[3] font-nunito font-semibold text-sm text-primary-text flex items-center gap-1">
              <MdAddCircle className="text-primary size-9" />
              <span>{complemento.getNome()}</span>
              <button
                type="button"
                title="Editar complemento"
                onClick={() =>
                  openTabsModal({
                    mode: 'edit',
                    complementoId: complemento.getId(),
                  })
                }
                className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center text-primary-text hover:bg-primary/10 transition-colors"
              >
                <MdModeEdit size={14} />
              </button>
            </div>
            <div className="flex-[3] font-nunito text-sm text-secondary-text">
              {complemento.getDescricao() || 'Nenhuma'}
            </div>

            <div className="flex-[2]">
              <div className="flex flex-col items-start gap-1">
              <span className="text-xs text-secondary-text font-semibold">Valor (R$)</span>
                 <div className="flex items-center justify-end gap-2 px-3 py-1.5 rounded-xl border border-gray-300 bg-white max-w-[110px]">
                 <span className="text-sm text-secondary-text font-normal">R$</span>
                   <input
                    type="text"
                    value={
                      valorInputs[complemento.getId()] ??
                      formatValorFromNumber(complemento.getValor())
                    }
                    onChange={(e) => handleValorInputChange(complemento.getId(), e.target.value)}
                    onBlur={() => handleValorSubmit(complemento.getId())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleValorSubmit(complemento.getId())
                      }
                    }}
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

            <div className="flex-1 font-nunito text-sm text-secondary-text text-center">
              <select
                value={(complemento.getTipoImpactoPreco() || 'nenhum').toLowerCase()}
                onChange={(e) =>
                  handleTipoImpactoChange(
                    complemento.getId(),
                    e.target.value as 'nenhum' | 'aumenta' | 'diminui'
                  )
                }
                disabled={!!savingTipoMap[complemento.getId()]}
                className={`w-full px-0 py-1.5 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-primary-text focus:outline-none focus:border-primary text-center ${
                  savingTipoMap[complemento.getId()] ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                <option value="nenhum">Nenhum</option>
                <option value="aumenta">Aumenta</option>
                <option value="diminui">Diminui</option>
              </select>
            </div>
            <div className="flex-[2] flex justify-center">
              <label
                className={`relative inline-flex h-6 w-12 items-center ${
                  togglingStatus[complemento.getId()]
                    ? 'cursor-not-allowed opacity-60'
                    : 'cursor-pointer'
                }`}
                title={complemento.isAtivo() ? 'Complemento Ativo' : 'Complemento Desativado'}
              >
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={complemento.isAtivo()}
                  onChange={(event) =>
                    handleToggleComplementoStatus(complemento, event.target.checked)
                  }
                  disabled={!!togglingStatus[complemento.getId()]}
                />
                <div className="h-full w-full rounded-full bg-gray-300 transition-colors peer-checked:bg-accent1" />
                <span className="absolute left-1 top-1/2 block h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow transition-transform duration-200 peer-checked:translate-x-5" />
              </label>
            </div>
            <div className="flex-1 flex justify-end">
              <ComplementoActionsMenu
                complementoId={complemento.getId()}
                complementoAtivo={complemento.isAtivo()}
                onStatusChanged={handleStatusChange}
              />
            </div>
          </div>
        ))}

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


