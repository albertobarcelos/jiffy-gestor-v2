'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { MdDelete, MdSearch } from 'react-icons/md'
import { Tooltip as MuiTooltip } from '@mui/material'
import { useAuthStore } from '@/src/presentation/stores/authStore'
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

export interface EntregadorDeliveryResumo {
  id: string
  nome: string | null
  telefone?: string | null
}

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
  const { auth, isAuthenticated } = useAuthStore()
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
    const token = auth?.getAccessToken()
    if (!token) return

    setIsLoading(true)
    try {
      const params = new URLSearchParams({ limit: '100', offset: '0' })
      const q = searchTextRef.current.trim()
      if (q) params.set('q', q)
      const status = filterStatusRef.current
      if (status === 'Ativo') params.set('ativo', 'true')
      if (status === 'Desativado') params.set('ativo', 'false')

      const res = await fetch(`/api/delivery/entregadores?${params.toString()}`, {
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
  }, [auth])

  useEffect(() => {
    if (!isAuthenticated) return
    const token = auth?.getAccessToken()
    if (!token) return

    void loadEntregadores()
  }, [isAuthenticated, debouncedSearch, filterStatus, auth, loadEntregadores])

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
    void loadEntregadores()
  }

  const solicitarExclusao = (entregador: EntregadorDeliveryResumo) => {
    setDeletingId(entregador.id)
    setDeletingNome(entregador.nome?.trim() || null)
    setConfirmDeleteOpen(true)
  }

  const confirmarExclusao = async () => {
    if (!deletingId) return
    const token = auth?.getAccessToken()
    if (!token) {
      showToast.error('Sessão expirada.')
      return
    }

    setIsDeleting(true)
    try {
      const res = await fetch(`/api/delivery/entregadores/${encodeURIComponent(deletingId)}`, {
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
      void loadEntregadores()
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Erro ao remover entregador')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-shrink-0 px-1 py-1 md:px-[30px]">
        <div className="flex items-center justify-between">
          <div className="w-1/2 md:pl-5">
            <p className="text-primary text-sm font-semibold md:text-lg">
              Entregadores Cadastrados
            </p>
            <p className="text-tertiary text-sm font-normal md:text-[22px]">
              Total {entregadores.length} de {total}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={abrirCriar}
              className="flex h-8 items-center gap-2 rounded-lg bg-primary px-[30px] font-exo text-sm font-semibold text-info transition-colors hover:bg-primary/90"
            >
              Novo
              <span className="text-lg">+</span>
            </button>
          </div>
        </div>
      </div>

      <div className="h-[4px] flex-shrink-0 border-t-2 border-primary/70" />

      <div className="flex items-start justify-start gap-3 p-1">
        <div className="flex flex-row items-start justify-start gap-2">
          <div className="relative flex-col h-8 min-w-[300px] max-w-[360px]">
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
              className="h-full w-full rounded-lg border border-gray-200 bg-info pl-11 pr-4 font-nunito text-sm text-primary-text placeholder:text-secondary-text focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        <div className="flex w-full flex-row items-center justify-start gap-2 sm:w-[160px]">
          <label className="mb-1 block text-xs font-semibold text-secondary-text">Status</label>
          <select
            value={filterStatus}
            onChange={e =>
              setFilterStatus(e.target.value as 'Todos' | 'Ativo' | 'Desativado')
            }
            className="h-8 w-full rounded-lg border border-gray-200 bg-info px-5 font-nunito text-sm text-primary-text focus:border-primary focus:outline-none"
          >
            <option value="Todos">Todos</option>
            <option value="Ativo">Ativo</option>
            <option value="Desativado">Desativado</option>
          </select>
        </div>
      </div>

      <div className="mt-0 flex-shrink-0 md:px-[0px]">
        <div className="flex h-10 items-center gap-2 rounded-lg bg-custom-2 px-4">
          <div className="flex-[2] font-nunito text-xs font-semibold text-primary-text md:text-sm">
            Nome
          </div>
          <div className="flex-[2] font-nunito text-xs font-semibold text-primary-text md:text-sm">
            Telefone
          </div>
          <div className="flex w-16 shrink-0 justify-end font-nunito text-xs font-semibold text-primary-text md:text-sm">
            Remover
          </div>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="mt-1 flex-1 overflow-y-auto px-1 scrollbar-hide md:px-[0px]"
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
              className={`${bgClass} mb-1 flex cursor-pointer items-center rounded-lg py-2 hover:bg-secondary-bg/15 md:px-4`}
            >
              <div className="flex-[2] flex items-center font-nunito text-xs font-normal text-primary-text md:text-sm">
                <span>{entregador.nome?.trim() || '-'}</span>
              </div>
              <div className="flex-[2] font-nunito text-xs text-secondary-text md:text-sm">
                {telefoneListaExibicao(entregador.telefone)}
              </div>
              <div
                className="flex w-16 shrink-0 justify-end"
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
