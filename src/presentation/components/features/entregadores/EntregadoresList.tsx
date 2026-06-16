'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { MdSearch, MdDelete, MdEdit } from 'react-icons/md'
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

export function EntregadoresList() {
  const { auth, isAuthenticated } = useAuthStore()
  const [entregadores, setEntregadores] = useState<EntregadorDeliveryResumo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [filterStatus, setFilterStatus] = useState<'Todos' | 'Ativo' | 'Desativado'>('Ativo')
  const [total, setTotal] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const searchTextRef = useRef('')
  const filterStatusRef = useRef(filterStatus)
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const hasLoadedRef = useRef(false)

  useEffect(() => {
    searchTextRef.current = searchText
  }, [searchText])

  useEffect(() => {
    filterStatusRef.current = filterStatus
  }, [filterStatus])

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
    }
  }, [auth])

  useEffect(() => {
    if (!isAuthenticated) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      void loadEntregadores()
    }, 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchText, filterStatus, isAuthenticated, loadEntregadores])

  useEffect(() => {
    if (!isAuthenticated || hasLoadedRef.current) return
    const token = auth?.getAccessToken()
    if (!token) return
    hasLoadedRef.current = true
    void loadEntregadores()
  }, [isAuthenticated, auth, loadEntregadores])

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

  const solicitarExclusao = (id: string) => {
    setDeletingId(id)
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
      void loadEntregadores()
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Erro ao remover entregador')
    } finally {
      setIsDeleting(false)
    }
  }

  const telefoneExibicao = (valor?: string | null) => {
    if (!valor?.trim()) return '-'
    return formatarTelefoneBr(valor) || valor
  }

  return (
    <div className="flex flex-col h-full">
      <div className="md:px-6 px-1 pt-1 pb-1 flex-shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-primary md:text-xl text-sm font-semibold font-nunito">
              Entregadores Cadastrados
            </p>
            <p className="text-xs text-secondary-text mt-0.5">
              Cadastro do módulo delivery — usado no Kanban e nos pedidos de entrega.
            </p>
          </div>
          <button
            type="button"
            onClick={abrirCriar}
            className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Novo
          </button>
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="search"
              placeholder="Buscar por nome ou telefone..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-3 text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as 'Todos' | 'Ativo' | 'Desativado')}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-secondary focus:outline-none"
          >
            <option value="Ativo">Ativos</option>
            <option value="Desativado">Desativados</option>
            <option value="Todos">Todos</option>
          </select>
        </div>
      </div>

      <div className="flex-1 min-h-0 md:px-6 px-1 pb-4">
        {isLoading ? (
          <JiffyLoading />
        ) : entregadores.length === 0 ? (
          <p className="text-sm text-secondary-text py-8 text-center">Nenhum entregador encontrado.</p>
        ) : (
          <div className="overflow-auto rounded-lg border border-gray-100 bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold text-secondary-text">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Telefone</th>
                  <th className="px-4 py-3 w-28 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entregadores.map(entregador => (
                  <tr key={entregador.id} className="hover:bg-gray-50/80">
                    <td className="px-4 py-3 font-medium text-primary-text">
                      {entregador.nome?.trim() || '—'}
                    </td>
                    <td className="px-4 py-3 text-secondary-text">
                      {telefoneExibicao(entregador.telefone)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          title="Editar"
                          onClick={() => abrirEditar(entregador.id)}
                          className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-secondary"
                        >
                          <MdEdit size={18} />
                        </button>
                        <button
                          type="button"
                          title="Remover"
                          onClick={() => solicitarExclusao(entregador.id)}
                          className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600"
                        >
                          <MdDelete size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!isLoading && total > 0 && (
          <p className="mt-2 text-xs text-secondary-text">{total} entregador(es)</p>
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
            O entregador será desativado e não aparecerá nas listas de seleção.
          </p>
          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => setConfirmDeleteOpen(false)}
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
