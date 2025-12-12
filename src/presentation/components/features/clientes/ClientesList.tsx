'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Cliente } from '@/src/domain/entities/Cliente'
import { ClienteActionsMenu } from './ClienteActionsMenu'
import { Skeleton } from '@/src/presentation/components/ui/skeleton'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { ClientesTabsModal, ClientesTabsModalState } from './ClientesTabsModal'
import { MdSearch } from 'react-icons/md'

interface ClientesListProps {
  onReload?: () => void
}

/**
 * Lista de clientes carregando todos os itens de uma vez
 * Faz requisições sequenciais de 10 em 10 até carregar tudo
 */
export function ClientesList({ onReload }: ClientesListProps) {
  const router = useRouter()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'Todos' | 'Ativo' | 'Desativado'>('Ativo')
  const [totalClientes, setTotalClientes] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const hasLoadedInitialRef = useRef(false)
  const { auth, isAuthenticated } = useAuthStore()

  const searchTextRef = useRef('')
  const filterStatusRef = useRef<'Todos' | 'Ativo' | 'Desativado'>('Ativo')

  const [modalState, setModalState] = useState<ClientesTabsModalState>({
    open: false,
    tab: 'cliente',
    mode: 'create',
  })

  // Atualiza refs quando os valores mudam
  useEffect(() => {
    searchTextRef.current = debouncedSearch
  }, [debouncedSearch])

  useEffect(() => {
    filterStatusRef.current = filterStatus
  }, [filterStatus])

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

  /**
   * Carrega todos os clientes fazendo requisições sequenciais
   * Continua carregando páginas de 10 em 10 até não haver mais itens
   */
  const loadAllClientes = useCallback(
    async () => {
      const token = auth?.getAccessToken()
      if (!token) {
        return
      }

      setIsLoading(true)

      try {
        const allClientes: Cliente[] = []
        let currentOffset = 0
        let hasMore = true
        let totalCount = 0

        // Determina o filtro ativo
        const ativoFilter =
          filterStatusRef.current === 'Ativo'
            ? true
            : filterStatusRef.current === 'Desativado'
              ? false
              : null

        // Loop para carregar todas as páginas
        while (hasMore) {
          const params = new URLSearchParams({
            limit: '10',
            offset: currentOffset.toString(),
          })

          if (searchTextRef.current) {
            params.append('q', searchTextRef.current)
          }

          if (ativoFilter !== null) {
            params.append('ativo', ativoFilter.toString())
          }

          const response = await fetch(`/api/clientes?${params.toString()}`, {
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

          const newClientes = (data.items || []).map((item: any) => Cliente.fromJSON(item))

          allClientes.push(...newClientes)

          // Atualiza o total apenas na primeira requisição
          if (currentOffset === 0) {
            totalCount = data.count || 0
          }

          // Verifica se há mais páginas
          // Se retornou menos de 10 itens, não há mais páginas
          hasMore = newClientes.length === 10
          currentOffset += newClientes.length
        }

        // Atualiza o estado com todos os itens carregados
        setClientes(allClientes)
        setTotalClientes(totalCount)
      } catch (error) {
        console.error('Erro ao carregar clientes:', error)
        setClientes([])
        setTotalClientes(0)
      } finally {
        setIsLoading(false)
      }
    },
    [auth]
  )

  // Carrega clientes quando busca ou filtro mudam
  useEffect(() => {
    const token = auth?.getAccessToken()
    if (!token) return

    loadAllClientes()
  }, [debouncedSearch, filterStatus, auth, loadAllClientes])

  // Carrega clientes iniciais apenas quando o token estiver disponível
  useEffect(() => {
    if (!isAuthenticated || hasLoadedInitialRef.current) return

    const token = auth?.getAccessToken()
    if (!token) return

    hasLoadedInitialRef.current = true
    loadAllClientes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  const handleStatusChange = () => {
    loadAllClientes()
    onReload?.()
  }

  const handleModalReload = () => {
    loadAllClientes()
    onReload?.()
  }

  const handleAdd = () => {
    setModalState({ open: true, tab: 'cliente', mode: 'create' })
  }

  const handleEdit = (clienteId: string) => {
    setModalState({ open: true, tab: 'cliente', mode: 'edit', clienteId })
  }

  const handleView = (clienteId: string) => {
    setModalState({ open: true, tab: 'visualizar', mode: 'view', clienteId })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header com título e botão */}
      <div className="px-[30px] pb-1">
        <div className="flex items-start justify-between">
          <div className="w-1/2 pl-5">
            <p className="text-primary text-sm font-semibold font-nunito">
              Clientes Cadastrados
            </p>
            <p className="text-tertiary text-[22px] font-medium font-nunito">
              Total {clientes.length} de {totalClientes}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="h-8 px-[30px] bg-primary text-info rounded-lg font-semibold font-exo text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors"
            >
              Novo
              <span className="text-lg">+</span>
            </button>
          </div>
        </div>
      </div>

      <div className="h-[4px] border-t-2 border-primary/70"></div>
      <div className="flex gap-3 px-[20px] py-2">
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
      <div className="px-[30px] mt-0">
        <div className="h-10 bg-custom-2 rounded-lg px-4 flex items-center gap-[10px]">
          <div className="flex-[2] font-nunito font-semibold text-sm text-primary-text">
            Nome
          </div>
          <div className="flex-[1.5] font-nunito font-semibold text-sm text-primary-text">
            CPF
          </div>
          <div className="flex-[1.5] font-nunito font-semibold text-sm text-primary-text">
            CNPJ
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
                className=" bg-info rounded-lg px-4 mb-2 flex items-center gap-[10px] shadow-xl hover:shadow-md transition-shadow hover:bg-secondary-bg/15"
                >
                <Skeleton className="flex-[2] h-4" />
                <Skeleton className="flex-[1.5] h-4" />
                <Skeleton className="flex-[1.5] h-4" />
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
            className=" bg-info rounded-lg px-4 py-1 mb-2 flex items-center gap-[10px] shadow-xl hover:shadow-md transition-shadow hover:bg-secondary-bg/15"
          >
            <div className="flex-[2] font-nunito font-semibold text-sm text-primary-text">
              {cliente.getNome()}
            </div>
            <div className="flex-[1.5] font-nunito text-sm text-secondary-text">
              {cliente.getCpf() || '-'}
            </div>
            <div className="flex-[1.5] font-nunito text-sm text-secondary-text">
              {cliente.getCnpj() || '-'}
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
                onEdit={handleEdit}
                onView={handleView}
              />
            </div>
          </div>
        ))}

        {isLoading && clientes.length > 0 && (
          <div className="flex justify-center py-4">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      <ClientesTabsModal
        state={modalState}
        onClose={() => setModalState({ ...modalState, open: false })}
        onTabChange={(tab) => setModalState({ ...modalState, tab })}
        onReload={handleModalReload}
      />
    </div>
  )
}

