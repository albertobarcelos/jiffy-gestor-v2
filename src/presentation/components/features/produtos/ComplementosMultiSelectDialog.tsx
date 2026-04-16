'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/src/presentation/components/ui/dialog'
import { Complemento } from '@/src/domain/entities/Complemento'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast } from '@/src/shared/utils/toast'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { MdClose, MdSearch, MdAdd } from 'react-icons/md'
import {
  GruposComplementosTabsModal,
  GruposComplementosTabsModalState,
} from '../grupos-complementos/GruposComplementosTabsModal'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'

interface GrupoComplemento {
  id: string
  nome: string
  complementos: Complemento[]
  obrigatorio: boolean
  qtdMinima: number
  qtdMaxima: number
}

/** Catálogo completo (mesmo endpoint do passo Configurações Gerais) */
interface GrupoCatalogoItem {
  id: string
  nome: string
  obrigatorio: boolean
}

const LISTAGEM_PAGE_SIZE = 25

/** Vinculados primeiro; depois ordem alfabética por nome */
function ordenarVinculadosPrimeiro<T extends { id: string; nome?: string }>(
  itens: T[],
  idsVinculados: string[]
): T[] {
  const set = new Set(idsVinculados)
  return [...itens].sort((a, b) => {
    const va = set.has(a.id) ? 1 : 0
    const vb = set.has(b.id) ? 1 : 0
    if (va !== vb) return vb - va
    return (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' })
  })
}

interface ComplementosMultiSelectDialogProps {
  open: boolean
  produtoId?: string
  produtoNome?: string
  onClose: () => void
  isEmbedded?: boolean
}

export function ComplementosMultiSelectDialog({
  open,
  produtoId,
  produtoNome,
  onClose,
  isEmbedded = false,
}: ComplementosMultiSelectDialogProps) {
  const { auth } = useAuthStore()
  const [groups, setGroups] = useState<GrupoComplemento[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [allSelectableGroups, setAllSelectableGroups] = useState<GrupoCatalogoItem[]>([])
  const [isLoadingSelectableGroups, setIsLoadingSelectableGroups] = useState(false)
  const [catalogSearch, setCatalogSearch] = useState('')
  const [gruposTabsModalState, setGruposTabsModalState] =
    useState<GruposComplementosTabsModalState>({
      open: false,
      tab: 'grupo',
      mode: 'create',
      grupo: undefined,
    })

  const loadGroups = useCallback(async () => {
    if (!open || !produtoId) return

    const token = auth?.getAccessToken()
    if (!token) {
      setGroups([])
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/produtos/${produtoId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Erro ao carregar complementos do produto')
      }

      const produto = await response.json()
      const grupos: GrupoComplemento[] = (produto.gruposComplementos || []).map((grupo: any) => ({
        id: grupo.id,
        nome: grupo.nome,
        complementos: (grupo.complementos || []).map((item: any) => Complemento.fromJSON(item)),
        obrigatorio: Boolean(grupo.obrigatorio),
        qtdMinima:
          typeof grupo.qtdMinima === 'number' ? grupo.qtdMinima : grupo.obrigatorio ? 1 : 0,
        qtdMaxima: typeof grupo.qtdMaxima === 'number' && grupo.qtdMaxima > 0 ? grupo.qtdMaxima : 0,
      }))

      setGroups(grupos)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar complementos')
    } finally {
      setIsLoading(false)
    }
  }, [open, produtoId, auth])

  const loadSelectableGroups = useCallback(async () => {
    const token = auth?.getAccessToken()
    if (!token) {
      setAllSelectableGroups([])
      return
    }

    setIsLoadingSelectableGroups(true)
    try {
      const limit = LISTAGEM_PAGE_SIZE
      let offset = 0
      let hasMore = true
      const collected: GrupoCatalogoItem[] = []

      while (hasMore) {
        const response = await fetch(
          `/api/grupos-complementos?ativo=true&limit=${limit}&offset=${offset}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: 'no-store',
          }
        )

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || errorData.message || 'Erro ao carregar grupos')
        }

        const data = await response.json()
        const items = data.items || []
        const mapped = items
          .map((item: any) => ({
            id: item.id?.toString() || '',
            nome: item.nome?.toString() || 'Grupo',
            obrigatorio: Boolean(item.obrigatorio),
          }))
          .filter((item: GrupoCatalogoItem) => Boolean(item.id))

        collected.push(...mapped)

        const fetchedCount = items.length
        const totalCount = data.count ?? collected.length
        offset += fetchedCount

        const apiHasNext =
          typeof data.hasNext === 'boolean'
            ? data.hasNext
            : fetchedCount === limit && collected.length < totalCount

        hasMore = apiHasNext
      }

      setAllSelectableGroups(collected)
    } catch (err) {
      console.error(err)
      showToast.error(
        err instanceof Error ? err.message : 'Erro ao carregar grupos de complementos.'
      )
    } finally {
      setIsLoadingSelectableGroups(false)
    }
  }, [auth])

  useEffect(() => {
    if (open) {
      setCatalogSearch('')
      loadGroups()
      void loadSelectableGroups()
    }
  }, [open, loadGroups, loadSelectableGroups])

  const gruposVinculadosIds = useMemo(() => groups.map(g => g.id), [groups])

  const gruposCatalogoParaLista = useMemo(() => {
    const term = catalogSearch.trim().toLowerCase()
    const filtrados = !term
      ? allSelectableGroups
      : allSelectableGroups.filter(item => (item.nome || '').toLowerCase().includes(term))
    return ordenarVinculadosPrimeiro(filtrados, gruposVinculadosIds)
  }, [allSelectableGroups, catalogSearch, gruposVinculadosIds])

  const persistGruposSelection = useCallback(
    async (ids: string[], successMessage?: string, options?: { silentSuccess?: boolean }) => {
      if (!produtoId) {
        showToast.error('Produto não encontrado.')
        return false
      }

      const token = auth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado. Faça login novamente.')
        return false
      }

      setIsUpdating(true)
      try {
        const response = await fetch(`/api/produtos/${produtoId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ gruposComplementosIds: ids }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || 'Erro ao atualizar grupos de complementos')
        }

        await loadGroups()
        if (!options?.silentSuccess) {
          showToast.success(successMessage ?? 'Grupos atualizados com sucesso!')
        }
        return true
      } catch (err) {
        console.error(err)
        showToast.error(err instanceof Error ? err.message : 'Erro ao atualizar grupos.')
        return false
      } finally {
        setIsUpdating(false)
      }
    },
    [produtoId, auth, loadGroups]
  )

  /** Liga/desliga vínculo na lista completa (mesmo PATCH do modal) */
  const handleToggleCatalogGrupo = useCallback(
    async (id: string) => {
      if (isUpdating || !produtoId) return
      const current = groups.map(g => g.id)
      const newIds = current.includes(id) ? current.filter(x => x !== id) : [...current, id]
      await persistGruposSelection(newIds, undefined, { silentSuccess: true })
    },
    [isUpdating, produtoId, groups, persistGruposSelection]
  )

  const handleClose = () => {
    onClose()
  }

  const handleOpenNovoGrupoModal = useCallback(() => {
    setGruposTabsModalState({
      open: true,
      tab: 'grupo',
      mode: 'create',
      grupo: undefined,
    })
  }, [])

  const handleCloseGruposTabsModal = useCallback(() => {
    setGruposTabsModalState(prev => ({
      ...prev,
      open: false,
    }))
  }, [])

  const handleGruposTabsTabChange = useCallback((tab: 'grupo' | 'complementos') => {
    setGruposTabsModalState(prev => ({
      ...prev,
      tab,
    }))
  }, [])

  const handleGruposTabsReload = useCallback(async () => {
    await loadGroups()
    await loadSelectableGroups()
  }, [loadGroups, loadSelectableGroups])

  const handleGruposTabsClose = useCallback(() => {
    setGruposTabsModalState(prev => ({
      ...prev,
      open: false,
    }))
    // Recarregar grupos após fechar o modal de edição
    loadGroups()
  }, [loadGroups])

  const renderCatalogoGruposCard = () => (
    <div className="mb-4 flex min-h-0 flex-col rounded-lg border border-[#E6E9F4] bg-white p-2 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12">
          <JiffyLoading />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center space-y-3 py-12 text-center">
          <p className="text-sm text-secondary-text">{error}</p>
          <button
            type="button"
            onClick={() => void loadGroups()}
            className="text-sm font-semibold text-primary hover:underline"
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <>
          <div className="relative mb-2 shrink-0">
            <MdSearch
              className="pointer-events-none absolute left-2.5 top-1/2 z-[1] -translate-y-1/2 text-secondary-text"
              size={16}
            />
            <input
              type="text"
              value={catalogSearch}
              onChange={e => setCatalogSearch(e.target.value)}
              placeholder="Buscar grupo..."
              className="font-nunito h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-xs text-primary-text placeholder:text-secondary-text focus:border-primary focus:outline-none"
            />
          </div>
          <div className="max-h-[280px] min-h-0 overflow-y-auto overscroll-y-contain rounded-lg border border-gray-100 bg-gray-50/50 scrollbar-hide md:max-h-[360px]">
            {isLoadingSelectableGroups ? (
              <p className="font-nunito py-8 text-center text-xs text-secondary-text">
                Carregando grupos...
              </p>
            ) : gruposCatalogoParaLista.length ? (
              <ul className="divide-y divide-gray-100">
                {gruposCatalogoParaLista.map(grupo => {
                  const vinculado = gruposVinculadosIds.includes(grupo.id)
                  return (
                    <li
                      key={grupo.id}
                      className="flex items-center justify-between gap-2 px-2 py-1.5 hover:bg-white/80"
                    >
                      <div className="min-w-0 flex-1 py-2">
                        <p className="font-nunito truncate uppercase text-xs font-medium text-primary-text">
                          {grupo.nome || 'Grupo'}
                        </p>
                        {grupo.obrigatorio ? (
                          <span className="mt-0.5 inline-flex rounded-full bg-primary/10 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-primary">
                            Obrigatório
                          </span>
                        ) : null}
                      </div>
                      <div
                        className="shrink-0"
                        onClick={e => e.stopPropagation()}
                        onMouseDown={e => e.stopPropagation()}
                      >
                        <JiffyIconSwitch
                          checked={vinculado}
                          onChange={e => {
                            e.stopPropagation()
                            void handleToggleCatalogGrupo(grupo.id)
                          }}
                          labelPosition="start"
                          bordered={false}
                          size="xs"
                          className="shrink-0"
                          disabled={isUpdating}
                          inputProps={{
                            'aria-label': vinculado
                              ? `Desvincular grupo ${grupo.nome ?? ''}`
                              : `Vincular grupo ${grupo.nome ?? ''}`,
                            onClick: e => e.stopPropagation(),
                          }}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="font-nunito py-8 text-center text-xs text-secondary-text">
                {allSelectableGroups.length === 0
                  ? 'Nenhum grupo de complementos cadastrado.'
                  : 'Nenhum grupo encontrado para a busca.'}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )

  const renderDialogBody = () => renderCatalogoGruposCard()

  if (isEmbedded) {
    return (
      <>
        <div className="flex h-full flex-col overflow-hidden">
          <div className="px-6 py-3">
            {/* Mesmo padrão de NovoComplemento (&quot;Dados do Complemento&quot;): título + linha + ação na mesma linha */}
            <div className="flex min-w-0 flex-wrap items-center gap-3 md:gap-5">
              <h2
                className="min-w-0 break-words font-exo text-lg font-semibold text-primary md:text-xl"
              >
                Complementos Vinculados
              </h2>
              <div className="h-px min-w-8 flex-1 bg-primary/70" />
              <button
                type="button"
                onClick={handleOpenNovoGrupoModal}
                disabled={isUpdating}
                className="flex shrink-0 items-center rounded-lg border border-primary bg-primary px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 md:h-8 md:gap-2 md:px-4 md:text-sm"
              >
                <MdAdd size={18} />
                Criar novo grupo
              </button>
            </div>
            <p className="font-nunito text-sm text-secondary-text">
              {groups.length} grupo{groups.length === 1 ? '' : 's'} vinculados
            </p>
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-4 scrollbar-hide md:px-6">
            {renderDialogBody()}
          </div>
        </div>
        <GruposComplementosTabsModal
          state={gruposTabsModalState}
          onClose={handleGruposTabsClose}
          onTabChange={handleGruposTabsTabChange}
          onReload={handleGruposTabsReload}
        />
      </>
    )
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={openState => !openState && handleClose()}
        fullWidth
        maxWidth="md"
        sx={{
          '& .MuiDialog-container': {
            alignItems: 'stretch',
            justifyContent: 'flex-end',
            margin: 0,
          },
        }}
        PaperProps={{
          sx: {
            m: 0,
            height: '100vh',
            maxHeight: '100vh',
            borderRadius: 0,
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <DialogHeader className="relative border-b border-gray-200 pb-4">
          <button
            type="button"
            onClick={handleClose}
            className="absolute left-2 top-2 text-secondary-text transition-colors hover:text-primary"
            aria-label="Fechar"
          >
            <MdClose size={22} />
          </button>
          <div className="pr-8">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <DialogTitle className="flex-1 !pb-0 !pt-0">
                {produtoNome ? `Complementos de ${produtoNome}` : 'Selecionar complementos'}
              </DialogTitle>
              <button
                type="button"
                onClick={handleOpenNovoGrupoModal}
                disabled={isUpdating}
                className="flex shrink-0 items-center rounded-lg border border-primary bg-primary px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 md:h-8 md:gap-2 md:px-4 md:text-sm"
              >
                <MdAdd size={18} />
                Criar novo grupo
              </button>
            </div>
            <p className="mt-1 text-xs text-secondary-text">
              {groups.length} grupo{groups.length === 1 ? '' : 's'} vinculados
            </p>
          </div>
        </DialogHeader>

        <DialogContent sx={{ padding: '16px 24px 0 24px' }}>{renderDialogBody()}</DialogContent>

        <DialogFooter
          className="flex items-center justify-start border-t border-gray-100"
          sx={{ justifyContent: 'flex-start' }}
        >
          <button
            type="button"
            onClick={handleClose}
            className="h-10 rounded-[24px] border border-gray-300 px-6 text-sm font-semibold text-primary-text transition-colors hover:bg-gray-50"
          >
            Fechar
          </button>
        </DialogFooter>
      </Dialog>

      <GruposComplementosTabsModal
        state={gruposTabsModalState}
        onClose={handleCloseGruposTabsModal}
        onTabChange={handleGruposTabsTabChange}
        onReload={handleGruposTabsReload}
      />
    </>
  )
}
