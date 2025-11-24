'use client'

import { useState, useEffect, useRef } from 'react'
import { useClientesInfinite } from '@/src/presentation/hooks/useClientes'
import { ClienteActionsMenu } from './ClienteActionsMenu'
import { Skeleton } from '@/src/presentation/components/ui/skeleton'

interface ClientesListProps {
  onReload?: () => void
}

/**
 * Lista de clientes com scroll infinito
 * Usa React Query para cache automático e deduplicação de requisições
 */
export function ClientesList({ onReload }: ClientesListProps) {
  const [searchText, setSearchText] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'Todos' | 'Ativo' | 'Desativado'>('Ativo')
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined)

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

  // Determina o filtro ativo
  const ativoFilter: boolean | null =
    filterStatus === 'Ativo' ? true : filterStatus === 'Desativado' ? false : null

  // Hook otimizado com React Query
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useClientesInfinite({
    q: debouncedSearch || undefined,
    ativo: ativoFilter,
    limit: 10,
  })

  // Achatando todas as páginas em uma única lista
  const clientes = data?.pages.flatMap((page) => page.clientes) || []
  const totalClientes = data?.pages[0]?.count || 0

  // Scroll infinito
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      if (scrollTop + clientHeight >= scrollHeight - 200) {
        if (hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  // Notificar erro
  useEffect(() => {
    if (error) {
      console.error('Erro ao carregar clientes:', error)
    }
  }, [error])

  const handleStatusChange = () => {
    onReload?.()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header com título e botão */}
      <div className="px-[30px] pt-[30px] pb-[10px]">
        <div className="flex items-start justify-between">
          <div className="w-1/2 pl-5">
            <p className="text-primary text-sm font-semibold font-nunito mb-2">
              Clientes Cadastrados
            </p>
            <p className="text-tertiary text-[26px] font-medium font-nunito">
              Total {clientes.length} de {totalClientes}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                window.location.href = '/clientes/novo'
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

      {/* Cabeçalho da tabela */}
      <div className="px-[30px] mt-0">
        <div className="h-10 bg-custom-2 rounded-lg px-4 flex items-center gap-[10px]">
          <div className="flex-[2] font-nunito font-semibold text-sm text-primary-text">
            Nome
          </div>
          <div className="flex-[2] font-nunito font-semibold text-sm text-primary-text">
            CPF/CNPJ
          </div>
          <div className="flex-[2] font-nunito font-semibold text-sm text-primary-text">
            Telefone
          </div>
          <div className="flex-[2] font-nunito font-semibold text-sm text-primary-text">
            Email
          </div>
          <div className="flex-[2] text-center font-nunito font-semibold text-sm text-primary-text">
            Status
          </div>
          <div className="flex-[2] text-right font-nunito font-semibold text-sm text-primary-text">
            Ações
          </div>
        </div>
      </div>

      {/* Lista de clientes com scroll */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-[30px] mt-2"
      >
        {/* Skeleton loaders para carregamento inicial */}
        {clientes.length === 0 && isLoading && (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-[50px] bg-info rounded-xl px-4 flex items-center gap-[10px]"
              >
                <Skeleton className="flex-[2] h-4" />
                <Skeleton className="flex-[2] h-4" />
                <Skeleton className="flex-[2] h-4" />
                <Skeleton className="flex-[2] h-4" />
                <Skeleton className="flex-[2] h-6 w-20 mx-auto" />
                <Skeleton className="flex-[2] h-10 w-10 ml-auto" />
              </div>
            ))}
          </div>
        )}

        {clientes.length === 0 && !isLoading && (
          <div className="flex items-center justify-center py-12">
            <p className="text-secondary-text">Nenhum cliente encontrado.</p>
          </div>
        )}

        {clientes.map((cliente) => (
          <div
            key={cliente.getId()}
            className="h-[50px] bg-info rounded-xl px-4 mb-2 flex items-center gap-[10px]"
          >
            <div className="flex-[2] font-nunito font-semibold text-sm text-primary-text">
              {cliente.getNome()}
            </div>
            <div className="flex-[2] font-nunito text-sm text-secondary-text">
              {cliente.getCnpj() || cliente.getCpf() || '-'}
            </div>
            <div className="flex-[2] font-nunito text-sm text-secondary-text">
              {cliente.getTelefone() || '-'}
            </div>
            <div className="flex-[2] font-nunito text-sm text-secondary-text">
              {cliente.getEmail() || '-'}
            </div>
            <div className="flex-[2] flex justify-center">
              <div
                className={`w-20 px-3 py-1 rounded-[24px] text-center text-sm font-nunito font-medium ${
                  cliente.isAtivo()
                    ? 'bg-success/20 text-success'
                    : 'bg-error/20 text-secondary-text'
                }`}
              >
                {cliente.isAtivo() ? 'Ativo' : 'Desativado'}
              </div>
            </div>
            <div className="flex-[2] flex justify-end">
              <ClienteActionsMenu
                clienteId={cliente.getId()}
                clienteAtivo={cliente.isAtivo()}
                onStatusChanged={handleStatusChange}
              />
            </div>
          </div>
        ))}

        {isFetchingNextPage && (
          <div className="flex justify-center py-4">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  )
}

