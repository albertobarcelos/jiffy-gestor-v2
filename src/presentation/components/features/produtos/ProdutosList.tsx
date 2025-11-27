'use client'

import { useState, useEffect, useRef, useMemo, useCallback, memo, lazy, Suspense } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useProdutosInfinite } from '@/src/presentation/hooks/useProdutos'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import { Skeleton } from '@/src/presentation/components/ui/skeleton'
import Link from 'next/link'
import { Produto } from '@/src/domain/entities/Produto'
import { showToast } from '@/src/shared/utils/toast'
import { useAuthStore } from '@/src/presentation/stores/authStore'

// Lazy load do menu de ações para reduzir bundle inicial
const ProdutoActionsMenu = lazy(() => import('./ProdutoActionsMenu').then(module => ({ default: module.ProdutoActionsMenu })))

interface ProdutosListProps {
  onReload?: () => void
}

const cloneProdutoWithChanges = (produto: Produto, changes: { valor?: number; ativo?: boolean }) => {
  return Produto.create(
    produto.getId(),
    produto.getCodigoProduto(),
    produto.getNome(),
    changes.valor ?? produto.getValor(),
    changes.ativo ?? produto.isAtivo(),
    produto.getNomeGrupo(),
    produto.getEstoque()
  )
}

/**
 * Item individual da lista de produtos (memoizado para evitar re-renders desnecessários)
 */
const ProdutoListItem = memo(function ProdutoListItem({
  produto,
  onValorChange,
  onSwitchToggle,
  onMenuStatusChanged,
  isSavingValor,
  isSavingStatus,
}: {
  produto: Produto
  onValorChange?: (valor: number) => void
  onSwitchToggle?: (status: boolean) => void
  onMenuStatusChanged?: () => void
  isSavingValor?: boolean
  isSavingStatus?: boolean
}) {
  const valorFormatado = useMemo(() => transformarParaReal(produto.getValor()), [produto])
  const isAtivo = useMemo(() => produto.isAtivo(), [produto])
  const [valorInput, setValorInput] = useState(produto.getValor().toFixed(2))

  useEffect(() => {
    setValorInput(produto.getValor().toFixed(2))
  }, [produto])

  const normalizeValor = useCallback((valor: string) => {
    const trimmed = valor.replace(/\s/g, '').replace(/[^\d.,-]/g, '')
    const hasComma = trimmed.includes(',')
    const withoutSeparators = hasComma ? trimmed.replace(/\./g, '') : trimmed
    const normalized = withoutSeparators.replace(',', '.')
    const parsed = Number(normalized)
    return Number.isNaN(parsed) ? null : parsed
  }, [])

  const handleValorSubmit = useCallback(() => {
    if (!onValorChange) return
    const parsed = normalizeValor(valorInput)
    if (parsed === null) {
      setValorInput(produto.getValor().toFixed(2))
      return
    }
    if (parsed === produto.getValor()) {
      return
    }
    onValorChange(parsed)
  }, [onValorChange, normalizeValor, valorInput, produto])

  return (
    <div className="bg-white border border-gray-100 rounded-2xl px-4 py-4 mb-3 shadow-sm flex items-center gap-4">
      <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 text-xl">
        <span>📦</span>
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-primary-text font-semibold font-nunito text-base">
            {produto.getNome()}
            <span className="text-sm text-secondary-text ml-2 inline-flex items-center gap-1">
              <span className="text-xs">Cód. </span>
              <span className="font-semibold">{produto.getCodigoProduto()}</span>
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 mt-2">
          {['📷', '📄', '⭐', '🏁', '🔗', '💾'].map((icon, index) => (
            <span
              key={`${produto.getId()}-${index}`}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs 
                ${index === 1 ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}`}
            >
              {icon}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap justify-end">
        <div className="flex flex-col">
          <label className="text-xs text-secondary-text font-nunito mb-1">Valor (R$)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text text-sm">
              R$
            </span>
            <input
              type="text"
              value={valorInput}
              onChange={(event) => setValorInput(event.target.value)}
              onBlur={handleValorSubmit}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.currentTarget.blur()
                }
              }}
              disabled={isSavingValor}
              className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 focus:border-primary focus:outline-none text-sm font-semibold text-primary-text w-32 disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>
          <span className="text-[11px] text-secondary-text mt-1">{valorFormatado}</span>
        </div>
        <div className="flex items-center">
          <label
            className={`relative inline-flex items-center ${isSavingStatus ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
          >
            <input
              type="checkbox"
              className="sr-only peer"
              checked={isAtivo}
              onChange={(event) => onSwitchToggle?.(event.target.checked)}
              disabled={isSavingStatus}
            />
            <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-green-500 transition relative">
              <div
                className="absolute w-5 h-5 bg-white rounded-full mt-0.5 ml-0.5 transition-all peer-checked:translate-x-6"
              />
            </div>
          </label>
        </div>
        <Suspense fallback={<div className="h-10 w-10" />}>
          <ProdutoActionsMenu
            produtoId={produto.getId()}
            produtoAtivo={isAtivo}
            onStatusChanged={onMenuStatusChanged}
          />
        </Suspense>
      </div>
    </div>
  )
})

/**
 * Lista de produtos com scroll infinito
 * Usa React Query para cache automático e deduplicação de requisições
 */
export function ProdutosList({ onReload }: ProdutosListProps) {
  const { auth } = useAuthStore()
  const queryClient = useQueryClient()
  const [searchText, setSearchText] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'Todos' | 'Ativo' | 'Desativado'>('Ativo')
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [localProdutos, setLocalProdutos] = useState<Produto[]>([])
  const [savingValorMap, setSavingValorMap] = useState<Record<string, boolean>>({})
  const [savingStatusMap, setSavingStatusMap] = useState<Record<string, boolean>>({})
  const pendingUpdatesRef = useRef(new Map<string, { valor?: number; ativo?: boolean }>())
  const token = auth?.getAccessToken()
  const invalidateProdutosQueries = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: ['produtos', 'infinite'],
      exact: false,
    })
  }, [queryClient])
  const setPendingUpdate = useCallback((produtoId: string, changes: { valor?: number; ativo?: boolean }) => {
    const current = pendingUpdatesRef.current.get(produtoId) || {}
    pendingUpdatesRef.current.set(produtoId, { ...current, ...changes })
  }, [])
  const clearPendingUpdateField = useCallback((produtoId: string, field: 'valor' | 'ativo') => {
    const current = pendingUpdatesRef.current.get(produtoId)
    if (!current) return
    const updated = { ...current }
    delete updated[field]
    if (Object.keys(updated).length === 0) {
      pendingUpdatesRef.current.delete(produtoId)
    } else {
      pendingUpdatesRef.current.set(produtoId, updated)
    }
  }, [])

  // Debounce da busca (500ms)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchText)
    }, 500)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [searchText])

  // Determina o filtro ativo (memoizado)
  const ativoFilter = useMemo<boolean | null>(() => {
    return filterStatus === 'Ativo' ? true : filterStatus === 'Desativado' ? false : null
  }, [filterStatus])

  const queryParams = useMemo(
    () => ({
      name: debouncedSearch || undefined,
      ativo: ativoFilter,
      limit: 10,
    }),
    [debouncedSearch, ativoFilter]
  )

  // Hook otimizado com React Query
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isLoading,
    error,
  } = useProdutosInfinite(queryParams)

  // Achatando todas as páginas em uma única lista (memoizado)
  const produtos = useMemo(() => {
    return data?.pages.flatMap((page) => page.produtos) || []
  }, [data])

  useEffect(() => {
    if (produtos.length === 0) {
      setLocalProdutos([])
      return
    }

    const merged = produtos.map((produto) => {
      const pending = pendingUpdatesRef.current.get(produto.getId())
      if (!pending) {
        return produto
      }
      return cloneProdutoWithChanges(produto, pending)
    })

    setLocalProdutos(merged)

    produtos.forEach((produto) => {
      const pending = pendingUpdatesRef.current.get(produto.getId())
      if (!pending) return
      const valorOk =
        pending.valor === undefined || produto.getValor() === Number(pending.valor)
      const ativoOk =
        pending.ativo === undefined || produto.isAtivo() === pending.ativo

      if (valorOk && ativoOk) {
        pendingUpdatesRef.current.delete(produto.getId())
      }
    })
  }, [produtos])

  const produtosAgrupados = useMemo(() => {
    const gruposMap = new Map<string, Produto[]>()
    localProdutos.forEach((produto) => {
      const grupo = produto.getNomeGrupo() || 'Sem grupo'
      if (!gruposMap.has(grupo)) {
        gruposMap.set(grupo, [])
      }
      gruposMap.get(grupo)?.push(produto)
    })
    return Array.from(gruposMap.entries())
  }, [localProdutos])

  // Intersection Observer para carregar 10 em 10
  useEffect(() => {
    const sentinel = loadMoreRef.current
    if (!sentinel || !hasNextPage || isFetchingNextPage || isFetching) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && hasNextPage && !isFetchingNextPage && !isFetching) {
            fetchNextPage()
          }
        })
      },
      {
        root: scrollContainerRef.current,
        rootMargin: '10px',
        threshold: 0.1,
      }
    )

    observer.observe(sentinel)

    return () => {
      observer.disconnect()
    }
  }, [hasNextPage, isFetchingNextPage, isFetching, fetchNextPage, produtos.length])

  // Notificar erro
  useEffect(() => {
    if (error) {
      console.error('Erro ao carregar produtos:', error)
    }
  }, [error])

  const handleValorUpdate = useCallback(
    async (produtoId: string, novoValor: number) => {
      if (!token) {
        showToast.error('Token não encontrado. Faça login novamente.')
        return
      }

      if (Number.isNaN(novoValor) || novoValor < 0) {
        showToast.error('Informe um valor válido para o produto.')
        return
      }

      const currentIndex = localProdutos.findIndex((produto) => produto.getId() === produtoId)
      if (currentIndex === -1) {
        showToast.error('Produto não encontrado na lista.')
        return
      }

      const previousProduto = localProdutos[currentIndex]
      let previousIndex = currentIndex

      setSavingValorMap((prev) => ({ ...prev, [produtoId]: true }))
      setPendingUpdate(produtoId, { valor: novoValor })
      setLocalProdutos((prev) => {
        const index = prev.findIndex((produto) => produto.getId() === produtoId)
        if (index === -1) {
          return prev
        }
        const updated = cloneProdutoWithChanges(prev[index], { valor: novoValor })
        const clone = [...prev]
        clone[index] = updated
        return clone
      })

      try {
        const response = await fetch(`/api/produtos/${produtoId}`, {
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
        onReload?.()
        await invalidateProdutosQueries()
      } catch (error: any) {
        console.error('Erro ao atualizar valor do produto:', error)
        setLocalProdutos((prev) => {
          if (!previousProduto) {
            return prev
          }
          const clone = [...prev]
          const index = clone.findIndex((produto) => produto.getId() === produtoId)
          if (index === -1) {
            const insertIndex =
              previousIndex >= 0 ? Math.min(previousIndex, clone.length) : clone.length
            clone.splice(insertIndex, 0, previousProduto)
          } else {
            clone[index] = previousProduto
          }
          return clone
        })
        clearPendingUpdateField(produtoId, 'valor')
        showToast.error(error.message || 'Erro ao atualizar valor do produto')
      } finally {
        setSavingValorMap((prev) => {
          const { [produtoId]: _, ...rest } = prev
          return rest
        })
      }
    },
    [token, onReload, localProdutos, setPendingUpdate, clearPendingUpdateField, invalidateProdutosQueries]
  )

  const handleStatusToggle = useCallback(
    async (produtoId: string, novoStatus: boolean) => {
      if (!token) {
        showToast.error('Token não encontrado. Faça login novamente.')
        return
      }

      const currentIndex = localProdutos.findIndex((produto) => produto.getId() === produtoId)
      if (currentIndex === -1) {
        showToast.error('Produto não encontrado na lista.')
        return
      }

      const previousProduto = localProdutos[currentIndex]
      let previousIndex = currentIndex

      setSavingStatusMap((prev) => ({ ...prev, [produtoId]: true }))
      setPendingUpdate(produtoId, { ativo: novoStatus })
      setLocalProdutos((prev) => {
        const index = prev.findIndex((produto) => produto.getId() === produtoId)
        if (index === -1) {
          return prev
        }
        const updated = cloneProdutoWithChanges(prev[index], { ativo: novoStatus })
        const clone = [...prev]
        clone[index] = updated

        if (
          (filterStatus === 'Ativo' && !novoStatus) ||
          (filterStatus === 'Desativado' && novoStatus)
        ) {
          clone.splice(index, 1)
        }

        return clone
      })

      try {
        const response = await fetch(`/api/produtos/${produtoId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ativo: novoStatus }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || 'Erro ao atualizar status')
        }

        showToast.success(
          novoStatus ? 'Produto ativado com sucesso!' : 'Produto desativado com sucesso!'
        )
        onReload?.()
        await invalidateProdutosQueries()
      } catch (error: any) {
        console.error('Erro ao atualizar status do produto:', error)
        setLocalProdutos((prev) => {
          if (!previousProduto) {
            return prev
          }
          const clone = [...prev]
          const index = clone.findIndex((produto) => produto.getId() === produtoId)
          if (index >= 0) {
            clone[index] = previousProduto
          } else {
            const insertIndex =
              previousIndex >= 0 ? Math.min(previousIndex, clone.length) : clone.length
            clone.splice(insertIndex, 0, previousProduto)
          }
          return clone
        })
        clearPendingUpdateField(produtoId, 'ativo')
        showToast.error(error.message || 'Erro ao atualizar status do produto')
      } finally {
        setSavingStatusMap((prev) => {
          const { [produtoId]: _, ...rest } = prev
          return rest
        })
      }
    },
    [token, filterStatus, onReload, localProdutos, setPendingUpdate, clearPendingUpdateField, invalidateProdutosQueries]
  )

  const handleMenuStatusChanged = useCallback(() => {
    onReload?.()
    invalidateProdutosQueries()
  }, [invalidateProdutosQueries, onReload])

  return (
    <div className="flex flex-col h-full">
      {/* Header com título e botão */}
      <div className="px-[30px] pt-[30px] pb-[10px]">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="pl-5">
            <p className="text-primary text-sm font-semibold font-nunito mb-2">
              Produtos Cadastrados
            </p>
            <p className="text-tertiary text-[26px] font-medium font-nunito">
              Total {localProdutos.length}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/produtos/atualizar-preco"
              className="h-10 px-[30px] bg-info text-primary-text border border-secondary rounded-[30px] font-semibold font-exo text-sm flex items-center gap-2 hover:bg-secondary-bg transition-colors"
            >
              Atualizar Preços
            </Link>
            <button
              onClick={() => {
                window.location.href = '/produtos/novo'
              }}
              className="h-10 px-[30px] bg-primary text-info rounded-[30px] font-semibold font-exo text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors"
            >
              Novo
              <span className="text-lg">+</span>
            </button>
          </div>
        </div>
      </div>

      {/* Divisor amarelo */}
      <div className="relative">
        <div className="h-[63px] border-t-2 border-alternate"></div>
        <div className="absolute top-3 left-[30px] right-[30px] flex gap-[10px]">
          {/* Barra de pesquisa */}
          <div className="flex-[3]">
            <div className="h-[50px] relative">
              <input
                type="text"
                placeholder="Pesquisar..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full h-full px-5 pl-12 rounded-[24px] border-[0.6px] border-secondary bg-info text-primary-text placeholder:text-secondary-text focus:outline-none focus:border-secondary font-nunito text-sm"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-text">
                🔍
              </span>
            </div>
          </div>

          {/* Filtro de status */}
          <div className="flex-1">
            <div className="h-[48px]">
              <select
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(e.target.value as 'Todos' | 'Ativo' | 'Desativado')
                }
                className="w-[175px] h-full px-5 rounded-[24px] border-[0.6px] border-secondary bg-info text-primary-text focus:outline-none focus:border-secondary font-nunito text-sm"
              >
                <option value="Todos">Todos</option>
                <option value="Ativo">Ativo</option>
                <option value="Desativado">Desativado</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de produtos com scroll */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-[30px] mt-4 space-y-6"
      >
        {(isLoading || (produtos.length === 0 && isFetching)) && (
          <div className="space-y-4">
            {[...Array(3)].map((_, index) => (
              <div key={`grupo-skeleton-${index}`} className="space-y-3">
                <div className="h-5 w-40 rounded-full bg-gray-200 animate-pulse" />
                {[...Array(3)].map((__, i) => (
                  <div key={`grupo-skeleton-${index}-${i}`} className="h-[90px] bg-gray-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            ))}
          </div>
        )}

        {localProdutos.length === 0 && !isLoading && (
          <div className="flex items-center justify-center py-12">
            <p className="text-secondary-text">Nenhum produto encontrado.</p>
          </div>
        )}

        {produtosAgrupados.map(([grupo, items]) => (
          <div key={grupo} className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-primary-text uppercase tracking-wide">
                  {grupo}
                </p>
                <p className="text-xs text-secondary-text">{items.length} produtos</p>
              </div>
            </div>

            <div className="space-y-3">
              {items.map((produto) => (
                <ProdutoListItem
                  key={produto.getId()}
                  produto={produto}
                  onValorChange={(valor) => handleValorUpdate(produto.getId(), valor)}
                  onSwitchToggle={(status) => handleStatusToggle(produto.getId(), status)}
                  onMenuStatusChanged={handleMenuStatusChanged}
                  isSavingValor={Boolean(savingValorMap[produto.getId()])}
                  isSavingStatus={Boolean(savingStatusMap[produto.getId()])}
                />
              ))}
            </div>
          </div>
        ))}

        {hasNextPage && !isFetchingNextPage && (
          <div ref={loadMoreRef} className="h-10" />
        )}

        {isFetchingNextPage && (
          <div className="flex justify-center py-4">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  )
}
