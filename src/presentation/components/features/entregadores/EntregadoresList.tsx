'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { MdDelete, MdLock, MdQrCode2, MdSearch } from 'react-icons/md'
import { Tooltip as MuiTooltip } from '@mui/material'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { invalidarQueriesEntregadores } from '@/src/presentation/components/features/pedidos/hooks/data/useEntregadoresQuery'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { showToast } from '@/src/shared/utils/toast'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { formatarTelefoneBr } from '@/src/shared/utils/telefoneBr'
import { textoErroCorpoApi } from '@/src/infrastructure/api/apiClient'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/src/presentation/components/ui/dialog'
import { EntregadorDeliveryModal } from './EntregadorDeliveryModal'
import { EntregadorSenhaDialog } from './EntregadorSenhaDialog'
import { EntregadorPwaQrDialog } from './EntregadorPwaQrDialog'

export interface EntregadorDeliveryResumo {
  id: string
  nome: string | null
  telefone?: string | null
}

const LISTA_GRADE =
  'grid w-full min-w-0 grid-cols-[minmax(0,1fr)_2.75rem_2.75rem] items-center gap-x-2 md:grid-cols-[minmax(0,1.4fr)_minmax(8rem,1fr)_3.5rem_5.25rem] md:gap-x-2.5'

const TOOLTIP_SLOT_PROPS = {
  tooltip: {
    sx: {
      bgcolor: '#ffffff',
      color: '#111827',
      border: '1px solid #e5e7eb',
      boxShadow: 2,
      fontSize: '0.8125rem',
    },
  },
} as const

function normalizarResumo(raw: unknown): EntregadorDeliveryResumo | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const id = String(row.id ?? '').trim()
  if (!id) return null
  return {
    id,
    nome: row.nome != null ? String(row.nome) : null,
    telefone: row.telefone != null ? String(row.telefone) : null,
  }
}

function extrairItems(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload
  if (payload && typeof payload === 'object') {
    const o = payload as Record<string, unknown>
    if (Array.isArray(o.items)) return o.items
    if (Array.isArray(o.data)) return o.data
  }
  return []
}

async function mensagemErroHttp(res: Response): Promise<string> {
  const raw: unknown = await res.json().catch(() => ({}))
  return (
    textoErroCorpoApi(raw) ||
    (raw &&
    typeof raw === 'object' &&
    'error' in raw &&
    typeof (raw as { error: unknown }).error === 'string'
      ? (raw as { error: string }).error
      : '') ||
    `Erro HTTP ${res.status}`
  )
}

function telefoneListaExibicao(valor?: string | null): string {
  if (!valor?.trim()) return '-'
  return formatarTelefoneBr(valor) || valor
}

export function EntregadoresList() {
  const { isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()
  const [entregadores, setEntregadores] = useState<EntregadorDeliveryResumo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'Todos' | 'Ativo' | 'Desativado'>('Ativo')
  const [total, setTotal] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingNome, setDeletingNome] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [senhaEntregadorId, setSenhaEntregadorId] = useState<string | null>(null)
  const [senhaEntregadorNome, setSenhaEntregadorNome] = useState<string | null>(null)
  const [pwaQrAberto, setPwaQrAberto] = useState(false)

  const searchTextRef = useRef('')
  const filterStatusRef = useRef(filterStatus)
  const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const hasLoadedInitialRef = useRef(false)

  useEffect(() => {
    searchTextRef.current = debouncedSearch
  }, [debouncedSearch])

  useEffect(() => {
    filterStatusRef.current = filterStatus
  }, [filterStatus])

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

  const loadEntregadores = useCallback(async () => {
    const token = useAuthStore.getState().tenantAuth?.getAccessToken()
    if (!token) return

    setIsLoading(true)
    try {
      const params = new URLSearchParams({ limit: '100', offset: '0' })
      const q = searchTextRef.current.trim()
      if (q) params.set('q', q)
      const status = filterStatusRef.current
      if (status === 'Ativo') params.set('ativo', 'true')
      if (status === 'Desativado') params.set('ativo', 'false')

      const res = await fetchGestorApi(`/api/delivery/entregadores?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      })

      if (!res.ok) {
        throw new Error(await mensagemErroHttp(res))
      }

      const data: unknown = await res.json()
      const items = extrairItems(data)
        .map(normalizarResumo)
        .filter((item): item is EntregadorDeliveryResumo => item !== null)

      const count =
        data && typeof data === 'object' && 'count' in data && typeof (data as { count: unknown }).count === 'number'
          ? (data as { count: number }).count
          : items.length

      setEntregadores(items)
      setTotal(count)
    } catch (error) {
      console.error('Erro ao listar entregadores:', error)
      showToast.error(error instanceof Error ? error.message : 'Erro ao listar entregadores')
      setEntregadores([])
      setTotal(0)
    } finally {
      setIsLoading(false)
      hasLoadedInitialRef.current = true
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    const token = useAuthStore.getState().tenantAuth?.getAccessToken()
    if (!token) return

    void loadEntregadores()
  }, [isAuthenticated, debouncedSearch, filterStatus, loadEntregadores])

  const abrirCriar = () => {
    setEditingId(null)
    setModalOpen(true)
  }

  const abrirEditar = (id: string) => {
    setEditingId(id)
    setModalOpen(true)
  }

  const fecharModal = () => {
    setModalOpen(false)
    setEditingId(null)
  }

  const handleSalvo = () => {
    fecharModal()
    invalidarQueriesEntregadores(queryClient, empresaId)
    void loadEntregadores()
  }

  const abrirSenha = (entregador: EntregadorDeliveryResumo) => {
    setSenhaEntregadorId(entregador.id)
    setSenhaEntregadorNome(entregador.nome?.trim() || null)
  }

  const fecharSenha = () => {
    setSenhaEntregadorId(null)
    setSenhaEntregadorNome(null)
  }

  const handleSenhaSalva = () => {
    fecharSenha()
  }

  const solicitarExclusao = (entregador: EntregadorDeliveryResumo) => {
    setDeletingId(entregador.id)
    setDeletingNome(entregador.nome?.trim() || null)
    setConfirmDeleteOpen(true)
  }

  const confirmarExclusao = async () => {
    if (!deletingId) return
    const token = useAuthStore.getState().tenantAuth?.getAccessToken()
    if (!token) {
      showToast.error('Sessão expirada.')
      return
    }

    setIsDeleting(true)
    try {
      const res = await fetchGestorApi(`/api/delivery/entregadores/${encodeURIComponent(deletingId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        throw new Error(await mensagemErroHttp(res))
      }
      showToast.success('Entregador removido.')
      setConfirmDeleteOpen(false)
      setDeletingId(null)
      setDeletingNome(null)
      invalidarQueriesEntregadores(queryClient, empresaId)
      void loadEntregadores()
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Erro ao remover entregador')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex h-full min-w-0 w-full flex-col">
      <div className="flex-shrink-0 px-1 pb-1 pt-1 md:px-6">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-primary md:text-xl">
              Entregadores Cadastrados
            </p>
            <p className="text-sm font-medium text-tertiary md:text-[22px]">
              Total {entregadores.length} de {total}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <MuiTooltip title="QR Code do app (PWA)" placement="bottom" slotProps={TOOLTIP_SLOT_PROPS}>
              <button
                type="button"
                aria-label="Mostrar QR Code do app do entregador"
                onClick={() => setPwaQrAberto(true)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/30 bg-info text-primary transition-colors hover:bg-primary/10"
              >
                <MdQrCode2 className="h-5 w-5" />
              </button>
            </MuiTooltip>
            <button
              type="button"
              onClick={abrirCriar}
              className="flex h-8 items-center gap-2 rounded-lg bg-primary px-2 text-sm font-semibold text-info transition-colors hover:bg-primary/90 md:px-[30px]"
            >
              Novo
              <span className="text-lg">+</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-shrink-0 gap-3 px-1 py-1 md:px-[20px]">
        <div className="min-w-0 flex-1 border-t-2 border-primary/70">
          <div className="mt-2 flex flex-wrap items-start gap-3">
            <div className="relative h-8 min-w-0 max-w-[360px] flex-1 basis-[180px]">
              <MdSearch
                className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-text"
                size={18}
              />
              <input
                id="entregadores-search"
                type="text"
                placeholder="Pesquisar entregador..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                className="h-full w-full rounded-lg border border-gray-200 bg-info pl-11 pr-4 text-sm text-primary-text placeholder:text-secondary-text focus:border-primary focus:outline-none"
              />
            </div>
            <div className="mt-0 flex w-full min-w-0 items-center gap-2 sm:w-[160px] sm:shrink-0">
              <label className="block text-xs font-semibold text-secondary-text">Status</label>
              <select
                value={filterStatus}
                onChange={e =>
                  setFilterStatus(e.target.value as 'Todos' | 'Ativo' | 'Desativado')
                }
                className="h-8 w-full rounded-lg border border-gray-200 bg-info px-5 text-sm text-primary-text focus:border-primary focus:outline-none"
              >
                <option value="Todos">Todos</option>
                <option value="Ativo">Ativo</option>
                <option value="Desativado">Desativado</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-0 min-w-0 flex-shrink-0 px-1 md:px-[20px]">
        <div className={`${LISTA_GRADE} h-10 rounded-lg bg-custom-2 px-2 md:px-4`}>
          <div className="min-w-0 text-xs font-semibold text-primary-text md:text-sm">
            Nome
          </div>
          <div className="hidden min-w-0 text-xs font-semibold text-primary-text md:block md:text-sm">
            Telefone
          </div>
          <div className="text-center text-[10px] font-semibold leading-tight text-primary-text md:text-sm">
            <span className="hidden whitespace-nowrap md:inline">Senha</span>
          </div>
          <div className="text-center text-[10px] font-semibold leading-tight text-primary-text md:text-sm">
            <span className="hidden whitespace-nowrap md:inline">Remover</span>
          </div>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="mt-1 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-1 scrollbar-hide md:px-[20px]"
        style={{ maxHeight: 'calc(100vh - 300px)' }}
      >
        {(isLoading || !hasLoadedInitialRef.current) && entregadores.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-12">
            <JiffyLoading />
          </div>
        )}

        {entregadores.length === 0 && !isLoading && hasLoadedInitialRef.current && (
          <div className="flex items-center justify-center py-12">
            <p className="text-secondary-text">Nenhum entregador encontrado.</p>
          </div>
        )}

        {entregadores.map((entregador, index) => {
          const isZebraEven = index % 2 === 0
          const bgClass = isZebraEven ? 'bg-gray-50' : 'bg-white'

          return (
            <div
              key={entregador.id}
              onClick={() => abrirEditar(entregador.id)}
              className={`${LISTA_GRADE} ${bgClass} mb-1 cursor-pointer rounded-lg px-2 py-2 hover:bg-secondary-bg/15 md:px-4`}
            >
              <div className="min-w-0 truncate text-xs font-normal text-primary-text md:text-sm">
                {entregador.nome?.trim() || '-'}
              </div>
              <div className="hidden min-w-0 truncate text-xs text-secondary-text md:block md:text-sm">
                {telefoneListaExibicao(entregador.telefone)}
              </div>
              <div
                className="flex justify-center"
                onClick={e => e.stopPropagation()}
                onMouseDown={e => e.stopPropagation()}
                onTouchStart={e => e.stopPropagation()}
              >
                <MuiTooltip title="Alterar senha do app" placement="bottom" slotProps={TOOLTIP_SLOT_PROPS}>
                  <button
                    type="button"
                    aria-label="Alterar senha do app"
                    onClick={() => abrirSenha(entregador)}
                    className="flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-primary/10"
                  >
                    <MdLock className="h-4 w-4 text-primary" />
                  </button>
                </MuiTooltip>
              </div>
              <div
                className="flex justify-center"
                onClick={e => e.stopPropagation()}
                onMouseDown={e => e.stopPropagation()}
                onTouchStart={e => e.stopPropagation()}
              >
                <MuiTooltip title="Remover entregador" placement="bottom" slotProps={TOOLTIP_SLOT_PROPS}>
                  <button
                    type="button"
                    aria-label="Remover entregador"
                    disabled={isDeleting && deletingId === entregador.id}
                    onClick={() => solicitarExclusao(entregador)}
                    className="flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-red-50 disabled:opacity-50"
                  >
                    <MdDelete className="h-4 w-4 text-red-500" />
                  </button>
                </MuiTooltip>
              </div>
            </div>
          )
        })}

        {isLoading && entregadores.length > 0 && (
          <div className="flex justify-center py-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        )}
      </div>

      <EntregadorDeliveryModal
        open={modalOpen}
        entregadorId={editingId}
        onClose={fecharModal}
        onSalvo={handleSalvo}
        onAbrirPwaQr={() => setPwaQrAberto(true)}
      />

      <EntregadorPwaQrDialog open={pwaQrAberto} onClose={() => setPwaQrAberto(false)} />

      <EntregadorSenhaDialog
        open={Boolean(senhaEntregadorId)}
        entregadorId={senhaEntregadorId}
        entregadorNome={senhaEntregadorNome}
        onClose={fecharSenha}
        onSalvo={handleSenhaSalva}
      />

      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover entregador?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-secondary-text">
            {deletingNome
              ? `O entregador "${deletingNome}" será desativado e não aparecerá nas listas de seleção.`
              : 'O entregador será desativado (exclusão lógica) e não aparecerá nas listas de seleção.'}
          </p>
          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => {
                setConfirmDeleteOpen(false)
                setDeletingId(null)
                setDeletingNome(null)
              }}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => void confirmarExclusao()}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isDeleting ? 'Removendo...' : 'Remover'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
