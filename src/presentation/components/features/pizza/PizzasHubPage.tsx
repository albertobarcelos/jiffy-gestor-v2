'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MdArrowBack, MdSearch } from 'react-icons/md'
import { CatalogGroupHeader } from '@/src/presentation/components/features/catalogo/CatalogGroupHeader'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { Button } from '@/src/presentation/components/ui/button'
import { showToast } from '@/src/shared/utils/toast'
import { useAtualizarPizzaCategoriaMutation } from '@/src/presentation/hooks/pizza/usePizza'
import { usePizzaHubLista } from '@/src/presentation/hooks/pizza/usePizzaHubLista'
import { PizzaCategoriaSetupPanel } from './PizzaCategoriaSetupPanel'
import { PizzaSaborModal } from './PizzaSaborModal'
import { PizzaCategoriaSaboresSection } from './PizzaCategoriaSaboresSection'
import {
  PizzaCategoriaPermissaoQuickActions,
  type PizzaCategoriaPermissaoField,
} from './PizzaCategoriaPermissaoQuickActions'
import { PizzaReorderModal } from './reorder/PizzaReorderModal'
import { useGestaoPath } from '@/src/presentation/hooks/useGestaoPath'
import type { CategoriaPizza, SaborPizzaSummary } from '@/src/shared/types/pizza'

type FilterStatus = 'Todos' | 'Ativo' | 'Inativo'

function PizzaCategoriaBlock({
  categoria,
  isExpanded,
  sabores,
  tamanhosTotal,
  catalogLoading,
  savingPermissao,
  onToggleExpand,
  onEditar,
  onAdicionarSabor,
  onEditarSabor,
  onToggleAtivo,
  onTogglePermissao,
}: {
  categoria: CategoriaPizza
  isExpanded: boolean
  sabores: SaborPizzaSummary[]
  tamanhosTotal: number
  catalogLoading: boolean
  savingPermissao: boolean
  onToggleExpand: (categoriaId: string) => void
  onEditar: (categoria: CategoriaPizza) => void
  onAdicionarSabor: (categoria: CategoriaPizza) => void
  onEditarSabor: (categoria: CategoriaPizza, saborId: string) => void
  onToggleAtivo: (categoria: CategoriaPizza, ativo: boolean) => void
  onTogglePermissao: (
    categoriaId: string,
    field: PizzaCategoriaPermissaoField,
    value: boolean
  ) => boolean | Promise<boolean>
}) {
  const saboresCount = sabores.length

  return (
    <div className="space-y-1">
      <div className="sticky top-0 z-20 -mx-1 bg-gray-50 px-1">
        <CatalogGroupHeader
          grupo={categoria.nome}
          grupoId={categoria.id}
          groupKey={categoria.id}
          grupoVisual={{ corHex: categoria.corHex, iconName: categoria.iconName }}
          grupoAtivo={categoria.ativo}
          itemCount={saboresCount}
          itemCountSubtitle={
            catalogLoading
              ? 'Carregando sabores…'
              : `${saboresCount} sabor${saboresCount === 1 ? '' : 'es'}`
          }
          isExpanded={isExpanded}
          addProdutoLabel="Adicionar item"
          actionsSlot={
            <PizzaCategoriaPermissaoQuickActions
              categoria={categoria}
              disabled={savingPermissao}
              onToggle={onTogglePermissao}
            />
          }
          onToggleExpand={onToggleExpand}
          onEditGrupo={() => onEditar(categoria)}
          onToggleGrupoStatus={() => onToggleAtivo(categoria, !categoria.ativo)}
          onAddProduto={() => {
            if (catalogLoading) return
            if (tamanhosTotal === 0) {
              showToast.error('Configure tamanhos na categoria antes de adicionar sabores')
              return
            }
            onAdicionarSabor(categoria)
          }}
        />
      </div>

      {!isExpanded ? (
        <div className="mx-1 rounded-xl border border-dashed border-secondary/40 px-4 py-1 text-sm text-secondary-text">
          Sabores ocultos. Clique{' '}
          <button
            type="button"
            onClick={() => onToggleExpand(categoria.id)}
            className="rounded-sm font-medium text-primary underline underline-offset-2 transition-colors hover:text-primary/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            aqui!
          </button>{' '}
          para visualizar.
        </div>
      ) : catalogLoading ? (
        <p className="px-2 py-3 text-sm text-secondary-text md:px-4">Carregando sabores…</p>
      ) : (
        <div className="overflow-visible rounded-lg bg-white">
          <PizzaCategoriaSaboresSection
            categoria={categoria}
            sabores={sabores}
            tamanhosTotal={tamanhosTotal}
            onEditarSabor={saborId => onEditarSabor(categoria, saborId)}
          />
        </div>
      )}
    </div>
  )
}

export function PizzasHubPage() {
  const router = useRouter()
  const { toGestao } = useGestaoPath()
  const atualizarCategoria = useAtualizarPizzaCategoriaMutation()

  const [searchText, setSearchText] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('Ativo')
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [setupOpen, setSetupOpen] = useState(false)
  const [reorderOpen, setReorderOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editCategoriaId, setEditCategoriaId] = useState<string | null>(null)
  const [saborModalOpen, setSaborModalOpen] = useState(false)
  const [categoriaSabor, setCategoriaSabor] = useState<CategoriaPizza | null>(null)
  const [saborEditId, setSaborEditId] = useState<string | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchText)
    }, 500)
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [searchText])

  const ativoFilter = useMemo<boolean | null>(() => {
    if (filterStatus === 'Ativo') return true
    if (filterStatus === 'Inativo') return false
    return null
  }, [filterStatus])

  const {
    categorias,
    saboresByCategoriaId,
    tamanhosCountByCategoriaId,
    isSearching,
    isLoading,
    catalogLoading,
    isError,
    refetch,
  } = usePizzaHubLista({
    q: debouncedSearch,
    ativo: ativoFilter,
  })

  // Na busca, abre categorias que trouxeram sabores pelo `q`.
  useEffect(() => {
    if (!isSearching) return
    setExpandedGroups(prev => {
      const next = { ...prev }
      let changed = false
      for (const categoria of categorias) {
        const sabores = saboresByCategoriaId[categoria.id] ?? []
        if (sabores.length > 0 && next[categoria.id] === false) {
          next[categoria.id] = true
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [isSearching, categorias, saboresByCategoriaId])

  const handleToggleExpand = useCallback((categoriaId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [categoriaId]: prev[categoriaId] === false,
    }))
  }, [])

  const handleToggleAtivo = async (categoria: CategoriaPizza, ativo: boolean) => {
    try {
      await atualizarCategoria.mutateAsync({ id: categoria.id, patch: { ativo } })
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Erro ao atualizar categoria')
    }
  }

  const handleTogglePermissao = useCallback(
    async (categoriaId: string, field: PizzaCategoriaPermissaoField, value: boolean) => {
      try {
        await atualizarCategoria.mutateAsync({
          id: categoriaId,
          patch: { [field]: value },
        })
        showToast.success(
          field === 'permiteAcrescimo'
            ? value
              ? 'Acréscimo habilitado para a categoria!'
              : 'Acréscimo desabilitado para a categoria!'
            : value
              ? 'Desconto habilitado para a categoria!'
              : 'Desconto desabilitado para a categoria!'
        )
        return true
      } catch (error) {
        showToast.error(
          error instanceof Error ? error.message : 'Erro ao atualizar permissão da categoria'
        )
        return false
      }
    },
    [atualizarCategoria]
  )

  const abrirNovoSabor = (categoria: CategoriaPizza) => {
    setCategoriaSabor(categoria)
    setSaborEditId(null)
    setSaborModalOpen(true)
  }

  const abrirEditarSabor = (categoria: CategoriaPizza, saborId: string) => {
    setCategoriaSabor(categoria)
    setSaborEditId(saborId)
    setSaborModalOpen(true)
  }

  const temFiltroAtivo = Boolean(debouncedSearch.trim()) || filterStatus !== 'Todos'
  const listaVazia = categorias.length === 0

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-50">
      <div className="z-30 shrink-0 border-b border-gray-200 bg-white">
        <div className="grid grid-cols-1 items-center gap-3 px-1 py-4 md:grid-cols-[1fr_auto_1fr] md:px-[30px]">
          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={() => router.push(toGestao('/produtos'))}
              className="rounded-lg p-2 text-secondary-text hover:bg-gray-100"
              aria-label="Voltar para produtos"
            >
              <MdArrowBack size={20} />
            </button>
            <h1 className="text-lg font-semibold text-primary-text">Pizzas</h1>
          </div>

          <div className="flex w-full items-center justify-center gap-3 md:w-auto">
            <div className="relative h-8 w-full min-w-[160px] max-w-[360px] md:w-[280px]">
              <input
                id="pizzas-hub-search"
                type="text"
                placeholder="Pesquisar categoria ou sabor..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                className="h-full w-full rounded-lg border border-gray-200 bg-info px-5 pl-12 text-sm text-primary-text placeholder:text-secondary-text focus:border-primary focus:outline-none"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-text">
                <MdSearch size={18} />
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <label
                htmlFor="pizzas-hub-status"
                className="text-xs font-semibold text-secondary-text"
              >
                Status
              </label>
              <select
                id="pizzas-hub-status"
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as FilterStatus)}
                className="h-8 w-[120px] rounded-lg border border-gray-200 bg-info px-3 text-sm text-primary-text focus:border-primary focus:outline-none"
              >
                <option value="Todos">Todos</option>
                <option value="Ativo">Ativo</option>
                <option value="Inativo">Inativo</option>
              </select>
            </div>
          </div>

          <div className="flex shrink-0 flex-nowrap items-center justify-start gap-1.5 md:justify-end">
            {categorias.length > 0 ? (
              <button
                type="button"
                onClick={() => setReorderOpen(true)}
                className="flex h-8 shrink-0 items-center whitespace-nowrap rounded-lg border border-primary/50 bg-white px-2.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 md:px-3 md:text-sm"
              >
                Reordenar pizzas
              </button>
            ) : null}
            <Button variant="contained" onClick={() => setSetupOpen(true)}>
              + Nova categoria pizza
            </Button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-4 scrollbar-hide md:px-[30px] md:pb-6">
        {isLoading ? (
          <JiffyLoading text="Carregando categorias pizza..." />
        ) : isError ? (
          <div className="rounded-xl border border-error/20 bg-white p-6 text-center">
            <p className="text-sm text-error">Não foi possível carregar as categorias pizza.</p>
            <Button variant="outlined" className="mt-4" onClick={() => void refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : listaVazia ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <p className="text-sm text-secondary-text">
              {temFiltroAtivo
                ? 'Nenhuma categoria ou sabor encontrado com os filtros atuais.'
                : 'Nenhuma categoria pizza cadastrada. Comece configurando tamanhos, massas e bordas.'}
            </p>
            {!temFiltroAtivo ? (
              <Button variant="contained" className="mt-4" onClick={() => setSetupOpen(true)}>
                Criar primeira categoria
              </Button>
            ) : null}
          </div>
        ) : (
          <div
            role="list"
            aria-label="Categorias pizza"
            className="flex w-full flex-col space-y-4 pb-4"
          >
            {categorias.map(categoria => (
              <div key={categoria.id} role="listitem">
                <PizzaCategoriaBlock
                  categoria={categoria}
                  isExpanded={expandedGroups[categoria.id] !== false}
                  sabores={saboresByCategoriaId[categoria.id] ?? []}
                  tamanhosTotal={tamanhosCountByCategoriaId[categoria.id] ?? 0}
                  catalogLoading={catalogLoading}
                  savingPermissao={atualizarCategoria.isPending}
                  onToggleExpand={handleToggleExpand}
                  onToggleAtivo={handleToggleAtivo}
                  onTogglePermissao={handleTogglePermissao}
                  onEditar={cat => {
                    setEditCategoriaId(cat.id)
                    setEditOpen(true)
                  }}
                  onAdicionarSabor={abrirNovoSabor}
                  onEditarSabor={abrirEditarSabor}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <PizzaCategoriaSetupPanel
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
        onSuccess={() => void refetch()}
      />

      <PizzaReorderModal open={reorderOpen} onClose={() => setReorderOpen(false)} />

      <PizzaCategoriaSetupPanel
        open={editOpen}
        mode="edit"
        categoriaId={editCategoriaId}
        onClose={() => {
          setEditOpen(false)
          setEditCategoriaId(null)
        }}
        onSuccess={() => void refetch()}
      />

      <PizzaSaborModal
        open={saborModalOpen}
        categoria={categoriaSabor}
        saborId={saborEditId}
        onClose={() => {
          setSaborModalOpen(false)
          setCategoriaSabor(null)
          setSaborEditId(null)
        }}
        onSuccess={() => void refetch()}
      />
    </div>
  )
}
