'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Complemento } from '@/src/domain/entities/Complemento'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import { ComplementoActionsMenu } from './ComplementoActionsMenu'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { MdSearch } from 'react-icons/md'
import { showToast } from '@/src/shared/utils/toast'

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
      if (searchTextRef.current !== searchText) {
        loadComplementos()
      }
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

  return (
    <div className="flex flex-col h-full">
      {/* Header com título e botão */}
      <div className="px-[30px] pt-[30px] pb-[10px]">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[220px] flex-1 pl-5">
            <p className="text-primary text-sm font-semibold font-nunito mb-1">
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
            onClick={() => {
              window.location.href = '/cadastros/complementos/novo'
            }}
            className="h-10 px-[30px] bg-primary text-info rounded-[30px] font-semibold font-exo text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors"
          >
            Novo
            <span className="text-lg">+</span>
          </button>
        </div>
      </div>

      <div className="h-[4px] border-t-2 border-alternate"></div>

      {/* Cabeçalho da tabela */}
      <div className="px-[30px] mt-0">
        <div className="h-10 bg-custom-2 rounded-lg px-4 flex items-center gap-[10px]">
          <div className="flex-[3] font-nunito font-semibold text-sm text-primary-text">
            Nome
          </div>
          <div className="flex-[2] font-nunito font-semibold text-sm text-primary-text">
            Descrição
          </div>
          <div className="flex-[2] font-nunito font-semibold text-sm text-primary-text">
            Valor
          </div>
          <div className="flex-[2] font-nunito font-semibold text-sm text-primary-text">
            Tipo Impacto
          </div>
          <div className="flex-[2] text-center font-nunito font-semibold text-sm text-primary-text">
            Status
          </div>
          <div className="flex-[2] text-right font-nunito font-semibold text-sm text-primary-text">
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
            className="h-[50px] bg-info rounded-xl px-4 mb-2 flex items-center gap-[10px]"
          >
            <div className="flex-[3] font-nunito font-semibold text-sm text-primary-text">
              {complemento.getNome()}
            </div>
            <div className="flex-[2] font-nunito text-sm text-secondary-text">
              {complemento.getDescricao() || '-'}
            </div>
            <div className="flex-[2] font-nunito text-sm text-secondary-text">
              {transformarParaReal(complemento.getValor())}
            </div>
            <div className="flex-[2] font-nunito text-sm text-secondary-text">
              {complemento.getTipoImpactoPreco() || '-'}
            </div>
            <div className="flex-[2] flex justify-center">
              <label
                className={`relative inline-flex h-6 w-12 items-center ${
                  togglingStatus[complemento.getId()]
                    ? 'cursor-not-allowed opacity-60'
                    : 'cursor-pointer'
                }`}
                title={complemento.isAtivo() ? 'Desativar complemento' : 'Ativar complemento'}
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
            <div className="flex-[2] flex justify-end">
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
    </div>
  )
}


