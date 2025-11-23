'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Produto } from '@/src/domain/entities/Produto'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import { ProdutoActionsMenu } from './ProdutoActionsMenu'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast, handleApiError } from '@/src/shared/utils/toast'
import { Skeleton } from '@/src/presentation/components/ui/skeleton'
import { Button } from '@/src/presentation/components/ui/button'
import Link from 'next/link'

interface ProdutosListProps {
  onReload?: () => void
}

/**
 * Lista de produtos com scroll infinito
 * Replica exatamente o design e lógica do Flutter
 */
export function ProdutosList({ onReload }: ProdutosListProps) {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasNextPage, setHasNextPage] = useState(true)
  const [offset, setOffset] = useState(0)
  const [searchText, setSearchText] = useState('')
  const [filterStatus, setFilterStatus] = useState<'Todos' | 'Ativo' | 'Desativado'>('Ativo')
  const [totalProdutos, setTotalProdutos] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout>()
  const hasLoadedInitialRef = useRef(false)
  const { auth, isAuthenticated } = useAuthStore()

  // Refs para evitar dependências desnecessárias no useCallback
  const isLoadingRef = useRef(false)
  const hasNextPageRef = useRef(true)
  const offsetRef = useRef(0)
  const searchTextRef = useRef('')
  const filterStatusRef = useRef<'Todos' | 'Ativo' | 'Desativado'>('Ativo')

  // Atualiza refs quando os valores mudam
  useEffect(() => {
    isLoadingRef.current = isLoading
  }, [isLoading])

  useEffect(() => {
    hasNextPageRef.current = hasNextPage
  }, [hasNextPage])

  useEffect(() => {
    offsetRef.current = offset
  }, [offset])

  useEffect(() => {
    searchTextRef.current = searchText
  }, [searchText])

  useEffect(() => {
    filterStatusRef.current = filterStatus
  }, [filterStatus])

  const loadProdutos = useCallback(
    async (reset: boolean = false) => {
      // Verifica se o token está disponível antes de continuar
      const token = auth?.getAccessToken()
      if (!token) {
        // Token ainda não está disponível, aguarda sem lançar erro
        return
      }

      if (isLoadingRef.current || (!hasNextPageRef.current && !reset)) return

      setIsLoading(true)
      isLoadingRef.current = true

      if (reset) {
        setOffset(0)
        offsetRef.current = 0
        setProdutos([])
        setHasNextPage(true)
        hasNextPageRef.current = true
      }

      const currentOffset = reset ? 0 : offsetRef.current

      // Determina o filtro ativo
      let ativoFilter: boolean | null = null
      if (filterStatusRef.current === 'Ativo') {
        ativoFilter = true
      } else if (filterStatusRef.current === 'Desativado') {
        ativoFilter = false
      }

      try {
        const params = new URLSearchParams({
          name: searchTextRef.current,
          limit: '10',
          offset: currentOffset.toString(),
        })

        if (ativoFilter !== null) {
          params.append('ativo', ativoFilter.toString())
        }

        const response = await fetch(`/api/produtos?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const errorMessage = errorData.message || `Erro ${response.status}: ${response.statusText}`
          throw new Error(errorMessage)
        }

        const data = await response.json()

        if (data.success) {
          const newProdutos = (data.items || []).map((item: any) =>
            Produto.fromJSON(item)
          )

          setProdutos((prev) => (reset ? newProdutos : [...prev, ...newProdutos]))
          const newOffset = reset ? newProdutos.length : offsetRef.current + newProdutos.length
          setOffset(newOffset)
          offsetRef.current = newOffset
          setHasNextPage(newProdutos.length === 10)
          hasNextPageRef.current = newProdutos.length === 10
          setTotalProdutos(data.count || 0)
        } else {
          throw new Error(data.message || 'Erro ao processar resposta da API')
        }
      } catch (error) {
        console.error('Erro ao carregar produtos:', error)
        setHasNextPage(false)
        hasNextPageRef.current = false
        // Só mostra erro se não for o carregamento inicial
        if (hasLoadedInitialRef.current) {
          const errorMessage = handleApiError(error)
          showToast.error(errorMessage)
        }
      } finally {
        setIsLoading(false)
        isLoadingRef.current = false
      }
    },
    // Apenas auth como dependência, os outros valores vêm de refs
    [auth]
  )

  // Debounce da busca
  useEffect(() => {
    const token = auth?.getAccessToken()
    if (!token) return

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      loadProdutos(true)
    }, 500)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText])

  // Carrega produtos quando o filtro muda
  useEffect(() => {
    const token = auth?.getAccessToken()
    if (!token) return
    loadProdutos(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus])

  // Scroll infinito
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      if (scrollTop + clientHeight >= scrollHeight - 200) {
        if (!isLoading && hasNextPage) {
          loadProdutos()
        }
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, hasNextPage])

  // Carrega produtos iniciais apenas quando o token estiver disponível
  useEffect(() => {
    if (!isAuthenticated || hasLoadedInitialRef.current) return
    
    const token = auth?.getAccessToken()
    if (!token) return
    
    hasLoadedInitialRef.current = true
    loadProdutos(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]) // Executa apenas quando isAuthenticated muda para true

  const handleStatusChange = () => {
    loadProdutos(true)
    onReload?.()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header com título e botão */}
      <div className="px-[30px] pt-[30px] pb-[10px]">
        <div className="flex items-start justify-between">
          <div className="w-1/2 pl-5">
            <p className="text-primary text-sm font-semibold font-nunito mb-2">
              Produtos Cadastrados
            </p>
            <p className="text-tertiary text-[26px] font-medium font-nunito">
              Total {produtos.length} de {totalProdutos}
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
                  setFilterStatus(
                    e.target.value as 'Todos' | 'Ativo' | 'Desativado'
                  )
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

      {/* Cabeçalho da tabela */}
      <div className="px-[30px] mt-0">
        <div className="h-10 bg-custom-2 rounded-lg px-4 flex items-center gap-[10px]">
          <div className="flex-[2] font-nunito font-semibold text-sm text-primary-text">
            Código
          </div>
          <div className="flex-[4] font-nunito font-semibold text-sm text-primary-text">
            Nome
          </div>
          <div className="flex-[2] font-nunito font-semibold text-sm text-primary-text">
            Grupo
          </div>
          <div className="flex-[2] font-nunito font-semibold text-sm text-primary-text">
            Estoque
          </div>
          <div className="flex-[2] text-center font-nunito font-semibold text-sm text-primary-text">
            Status
          </div>
          <div className="flex-[2] font-nunito font-semibold text-sm text-primary-text">
            Valor
          </div>
          <div className="flex-[2] text-right font-nunito font-semibold text-sm text-primary-text">
            Ações
          </div>
        </div>
      </div>

      {/* Lista de produtos com scroll */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-[30px] mt-2"
      >
        {/* Skeleton loaders para carregamento inicial */}
        {produtos.length === 0 && isLoading && (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-[50px] bg-info rounded-xl px-4 flex items-center gap-[10px]"
              >
                <Skeleton className="flex-[2] h-4" />
                <Skeleton className="flex-[4] h-4" />
                <Skeleton className="flex-[2] h-4" />
                <Skeleton className="flex-[2] h-4" />
                <Skeleton className="flex-[2] h-6 w-20 mx-auto" />
                <Skeleton className="flex-[2] h-4" />
                <Skeleton className="flex-[2] h-10 w-10 ml-auto" />
              </div>
            ))}
          </div>
        )}

        {produtos.length === 0 && !isLoading && (
          <div className="flex items-center justify-center py-12">
            <p className="text-secondary-text">Nenhum produto encontrado.</p>
          </div>
        )}

        {produtos.map((produto) => (
          <div
            key={produto.getId()}
            className="h-[50px] bg-info rounded-xl px-4 mb-2 flex items-center gap-[10px]"
          >
            <div className="flex-[2] font-nunito font-semibold text-sm text-primary-text">
              {produto.getCodigoProduto()}
            </div>
            <div className="flex-[4] font-nunito font-semibold text-sm text-primary-text">
              {produto.getNome()}
            </div>
            <div className="flex-[2] font-nunito text-sm text-secondary-text">
              {produto.getNomeGrupo() || 'Sem grupo'}
            </div>
            <div className="flex-[2] font-nunito text-sm text-secondary-text">
              {produto.getEstoque()?.toString() || 'Sem estoque'}
            </div>
            <div className="flex-[2] flex justify-center">
              <div
                className={`w-20 px-3 py-1 rounded-[24px] text-center text-sm font-nunito font-medium ${
                  produto.isAtivo()
                    ? 'bg-success/20 text-success'
                    : 'bg-error/20 text-secondary-text'
                }`}
              >
                {produto.isAtivo() ? 'Ativo' : 'Desativado'}
              </div>
            </div>
            <div className="flex-[2] font-nunito text-sm text-secondary-text">
              {transformarParaReal(produto.getValor())}
            </div>
            <div className="flex-[2] flex justify-end">
              <ProdutoActionsMenu
                produtoId={produto.getId()}
                produtoAtivo={produto.isAtivo()}
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

