'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogFooter } from '@/src/presentation/components/ui/dialog'
import { Button } from '@/src/presentation/components/ui/button'
import { Input } from '@/src/presentation/components/ui/input'
import { Label } from '@/src/presentation/components/ui/label'
import { useClientesInfinite } from '@/src/presentation/hooks/useClientes'
import { Cliente } from '@/src/domain/entities/Cliente'
import { MdSearch, MdClose, MdAdd } from 'react-icons/md'
import { ClientesTabsModal, ClientesTabsModalState } from '@/src/presentation/components/features/clientes/ClientesTabsModal'
import { useQueryClient } from '@tanstack/react-query'

interface SeletorClienteModalProps {
  open: boolean
  onClose: () => void
  onSelect: (cliente: Cliente) => void
}

export function SeletorClienteModal({ open, onClose, onSelect }: SeletorClienteModalProps) {
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

  // Hook com paginação infinita - limit 100 para carregar mais clientes por página
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isLoading,
    error,
  } = useClientesInfinite({
    q: debouncedSearch || undefined,
    ativo: ativoFilter,
    limit: 100, // Máximo permitido pela API
  })

  // Lista de clientes achatada
  const clientes = useMemo(() => {
    return data?.pages.flatMap((page) => page.clientes) || []
  }, [data])

  const totalClientes = useMemo(() => {
    return data?.pages[0]?.count || 0
  }, [data])

  // Scroll infinito usando Intersection Observer
  useEffect(() => {
    const loadMoreElement = loadMoreRef.current
    if (!loadMoreElement || !hasNextPage || isFetchingNextPage || isFetching) return

    const observer = new IntersectionObserver(
      (entries) => {
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
    setClienteTabsModalState((prev) => ({
      ...prev,
      open: false,
    }))
  }, [])

  const handleClienteTabsModalReload = useCallback(() => {
    // Invalidar queries de clientes para atualizar a lista
    queryClient.invalidateQueries({ queryKey: ['clientes'] })
  }, [queryClient])

  const handleClienteTabsModalTabChange = useCallback((tab: 'cliente' | 'visualizar') => {
    setClienteTabsModalState((prev) => ({
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
            <DialogTitle>Selecionar Cliente</DialogTitle>
            <Button
              type="button"
              onClick={handleOpenNovoCliente}
              className="h-8 px-4 rounded-lg font-semibold font-nunito text-sm flex items-center gap-2"
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
          style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0 24px', minHeight: 0 }}
          className="scrollbar-thin"
        >
          {/* Total de clientes */}
          {!isLoading && clientes.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-secondary-text">
                Mostrando {clientes.length} de {totalClientes} clientes
              </p>
            </div>
          )}

          {/* Filtros */}
          <div className="flex gap-3 mb-4">
            <div className="flex-1 min-w-[180px] max-w-[360px]">
              <Label className="text-xs font-semibold text-secondary-text mb-1 block">
                Buscar cliente...
              </Label>
              <div className="relative">
                <Input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Pesquisar por nome..."
                  className="w-full rounded-lg border border-gray-200 bg-info text-primary-text placeholder:text-secondary-text focus:outline-none focus:border-primary text-sm font-nunito"
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
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text pointer-events-none z-10">
                  <MdSearch size={18} />
                </span>
              </div>
            </div>

            <div className="w-full sm:w-[160px]">
              <Label className="text-xs font-semibold text-secondary-text mb-1 block">
                Status
              </Label>
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

          {/* Lista de clientes */}
          <div
            ref={scrollContainerRef}
            className="space-y-0 flex-1 overflow-y-auto bg-white rounded-lg p-2"
            style={{ minHeight: 0 }}
          >
            {/* Barra de título */}
            {!isLoading && !error && (
              <div className="bg-primary/15 px-4 py-2 rounded-lg mb-2">
                <p className="text-sm font-semibold text-primary-text font-nunito">
                  Nome do Cliente
                </p>
              </div>
            )}
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-medium text-primary-text font-nunito">
                    Carregando...
                  </span>
                </div>
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
                    className={`w-full p-3 transition-colors text-left rounded-lg ${
                      index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                    } hover:bg-custom-2`}
                  >
                    <div className="font-medium text-sm text-primary-text">
                      {cliente.getNome()}
                    </div>
                  </button>
                ))}

                {/* Elemento sentinela para Intersection Observer */}
                {hasNextPage && !isFetchingNextPage && (
                  <div ref={loadMoreRef} className="h-20 flex items-center justify-center">
                    {/* Espaço para trigger do observer */}
                  </div>
                )}

                {isFetchingNextPage && (
                  <div className="flex justify-center py-4">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <DialogFooter sx={{ padding: '16px 24px 24px 24px', flexShrink: 0, borderTop: '1px solid #e5e7eb', marginTop: 0 }}>
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
