'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
} from '@/src/presentation/components/ui/dialog'
import { Button } from '@/src/presentation/components/ui/button'
import { Input } from '@/src/presentation/components/ui/input'
import { Label } from '@/src/presentation/components/ui/label'
import { useClientesInfinite } from '@/src/presentation/hooks/useClientes'
import { Cliente } from '@/src/domain/entities/Cliente'
import { MdSearch, MdClose, MdAdd } from 'react-icons/md'
import {
  ClientesTabsModal,
  ClientesTabsModalState,
} from '@/src/presentation/components/features/clientes/ClientesTabsModal'
import { useQueryClient } from '@tanstack/react-query'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
interface SeletorClienteModalProps {
  open: boolean
  onClose: () => void
  onSelect: (cliente: Cliente) => void
  /** Título do modal (ex.: fluxo de venda no Kanban) */
  title?: string
}

export function SeletorClienteModal({
  open,
  onClose,
  onSelect,
  title = 'Selecionar Cliente',
}: SeletorClienteModalProps) {
  const queryClient = useQueryClient()
  const [searchText, setSearchText] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'Todos' | 'Ativo' | 'Desativado'>('Ativo')
  const [clienteTabsModalState, setClienteTabsModalState] = useState<ClientesTabsModalState>({
    open: false,
    tab: 'cliente',
    mode: 'create',
    clienteId: undefined,
  })
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

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

  // Objeto estável para queryKey do React Query (evita refetch desnecessário a cada render)
  const clientesQueryParams = useMemo(
    () => ({
      q: debouncedSearch.trim() || undefined,
      ativo: ativoFilter,
      limit: 100 as const,
    }),
    [debouncedSearch, ativoFilter]
  )

  // Hook com paginação infinita - limit 100 para carregar mais clientes por página
  const { data, fetchNextPage, hasNextPage, isFetching, isFetchingNextPage, isLoading, error } =
    useClientesInfinite(clientesQueryParams)

  // Achata páginas, remove duplicatas por id (se a API repetir offset) e aplica filtro local no nome
  // quando há texto — defesa se o backend ignorar o parâmetro `q`.
  const clientes = useMemo(() => {
    const flat = data?.pages.flatMap(page => page.clientes) || []
    const porId = new Map<string, Cliente>()
    for (const c of flat) {
      const id = c.getId()
      if (!porId.has(id)) porId.set(id, c)
    }
    let lista = Array.from(porId.values())
    const termo = debouncedSearch.trim().toLowerCase()
    if (termo) {
      lista = lista.filter(c => c.getNome().toLowerCase().includes(termo))
    }
    return lista
  }, [data, debouncedSearch])

  const totalClientes = useMemo(() => {
    return data?.pages[0]?.count || 0
  }, [data])

  // Scroll infinito usando Intersection Observer
  useEffect(() => {
    const loadMoreElement = loadMoreRef.current
    if (!loadMoreElement || !hasNextPage || isFetchingNextPage || isFetching) return

    const observer = new IntersectionObserver(
      entries => {
        const [entry] = entries
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage && !isFetching) {
          fetchNextPage()
        }
      },
      {
        root: scrollContainerRef.current,
        rootMargin: '10px',
        threshold: 0.1,
      }
    )

    observer.observe(loadMoreElement)

    return () => {
      observer.disconnect()
    }
  }, [hasNextPage, isFetchingNextPage, isFetching, fetchNextPage, clientes.length])

  const handleSelect = useCallback(
    (cliente: Cliente) => {
      onSelect(cliente)
      onClose()
      // Resetar busca ao fechar
      setSearchText('')
      setDebouncedSearch('')
    },
    [onSelect, onClose]
  )

  const handleClose = useCallback(() => {
    setSearchText('')
    setDebouncedSearch('')
    onClose()
  }, [onClose])

  const handleOpenNovoCliente = useCallback(() => {
    setClienteTabsModalState({
      open: true,
      tab: 'cliente',
      mode: 'create',
      clienteId: undefined,
    })
  }, [])

  const handleCloseClienteTabsModal = useCallback(() => {
    setClienteTabsModalState(prev => ({
      ...prev,
      open: false,
    }))
  }, [])

  const handleClienteTabsModalReload = useCallback(() => {
    // Invalidar queries de clientes para atualizar a lista
    queryClient.invalidateQueries({ queryKey: ['clientes'] })
  }, [queryClient])

  const handleClienteTabsModalTabChange = useCallback((tab: 'cliente' | 'visualizar') => {
    setClienteTabsModalState(prev => ({
      ...prev,
      tab,
    }))
  }, [])

  return (
    <Dialog
      open={open}
      onOpenChange={handleClose}
      maxWidth={false}
      sx={{
        '& .MuiDialog-container': {
          zIndex: 1400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
        '& .MuiBackdrop-root': { zIndex: 1400, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
        '& .MuiDialog-paper': {
          zIndex: 1400,
          backgroundColor: '#f9fafb', // gray-50
          opacity: 1,
          maxHeight: '90vh',
          margin: '32px',
          width: 'auto',
          maxWidth: 'calc(100% - 64px)',
        },
      }}
    >
      <DialogContent
        sx={{
          width: '42rem',
          maxWidth: '100%',
          height: '600px',
          maxHeight: '90vh',
          overflow: 'hidden',
          backgroundColor: '#f9fafb', // gray-50
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: '24px 24px 16px 24px', flexShrink: 0 }}>
          <div className="flex items-center justify-between">
            <DialogTitle>{title}</DialogTitle>
            <Button
              type="button"
              onClick={handleOpenNovoCliente}
              className="font-nunito flex h-8 items-center gap-2 rounded-lg px-4 text-sm font-semibold"
              sx={{
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                '&:hover': {
                  backgroundColor: 'var(--color-primary)',
                  opacity: 0.9,
                },
              }}
            >
              <MdAdd size={18} />
              Novo Cliente
            </Button>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '0 24px',
            minHeight: 0,
          }}
          className="scrollbar-thin"
        >
          {/* Total de clientes */}
          {!isLoading && clientes.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-secondary-text">
                {debouncedSearch.trim()
                  ? `Encontrados ${clientes.length} cliente(s) para "${debouncedSearch.trim()}"`
                  : `Mostrando ${clientes.length} de ${totalClientes} clientes`}
              </p>
            </div>
          )}

          {/* Filtros */}
          <div className="mb-4 flex gap-3">
            <div className="min-w-[180px] max-w-[360px] flex-1">
              <Label className="mb-1 block text-xs font-semibold text-secondary-text">
                Buscar cliente...
              </Label>
              <div className="relative">
                <Input
                  type="text"
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  placeholder="Pesquisar por nome..."
                  className="font-nunito w-full rounded-lg border border-gray-200 bg-info text-sm text-primary-text placeholder:text-secondary-text focus:border-primary focus:outline-none"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      height: '32px',
                    },
                    '& .MuiOutlinedInput-input': {
                      paddingLeft: '2.5rem',
                      paddingRight: '1rem',
                      height: '32px',
                      paddingTop: '8px',
                      paddingBottom: '8px',
                    },
                  }}
                />
                <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-secondary-text">
                  <MdSearch size={18} />
                </span>
              </div>
            </div>

            <div className="w-full sm:w-[160px]">
              <Label className="mb-1 block text-xs font-semibold text-secondary-text">Status</Label>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as 'Todos' | 'Ativo' | 'Desativado')}
                className="font-nunito h-8 w-full rounded-lg border border-gray-200 bg-info px-5 text-sm text-primary-text focus:border-primary focus:outline-none"
              >
                <option value="Todos">Todos</option>
                <option value="Ativo">Ativo</option>
                <option value="Desativado">Desativado</option>
              </select>
            </div>
          </div>

          {/* Lista de clientes */}
          <div
            ref={scrollContainerRef}
            className="flex-1 space-y-0 overflow-y-auto rounded-lg bg-white p-2"
            style={{ minHeight: 0 }}
          >
            {/* Barra de título */}
            {!isLoading && !error && (
              <div className="mb-2 rounded-lg bg-primary/15 px-4 py-2">
                <p className="font-nunito text-sm font-semibold text-primary-text">
                  Nome do Cliente
                </p>
              </div>
            )}

            {isLoading ? (
              <div className="flex h-full items-center justify-center bg-gray-50">
                <JiffyLoading />
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-red-500">Erro ao carregar clientes</p>
              </div>
            ) : clientes.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-secondary-text">Nenhum cliente encontrado.</p>
              </div>
            ) : (
              <>
                {clientes.map((cliente, index) => (
                  <button
                    key={cliente.getId()}
                    onClick={() => handleSelect(cliente)}
                    className={`w-full rounded-lg p-3 text-left transition-colors ${
                      index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                    } hover:bg-custom-2`}
                  >
                    <div className="text-sm font-medium text-primary-text">{cliente.getNome()}</div>
                  </button>
                ))}

                {/* Elemento sentinela para Intersection Observer */}
                {hasNextPage && !isFetchingNextPage && (
                  <div ref={loadMoreRef} className="flex h-20 items-center justify-center">
                    {/* Espaço para trigger do observer */}
                  </div>
                )}

                {isFetchingNextPage && (
                  <div className="flex justify-center py-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <DialogFooter
          sx={{
            padding: '16px 24px 24px 24px',
            flexShrink: 0,
            borderTop: '1px solid #e5e7eb',
            marginTop: 0,
          }}
        >
          <Button variant="outlined" onClick={handleClose}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>

      <ClientesTabsModal
        state={clienteTabsModalState}
        onClose={handleCloseClienteTabsModal}
        onReload={handleClienteTabsModalReload}
        onTabChange={handleClienteTabsModalTabChange}
      />
    </Dialog>
  )
}
