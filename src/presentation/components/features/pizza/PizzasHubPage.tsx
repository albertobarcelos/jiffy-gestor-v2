'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MdArrowBack, MdArrowDownward, MdArrowUpward } from 'react-icons/md'
import { CatalogGroupHeader } from '@/src/presentation/components/features/catalogo/CatalogGroupHeader'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { Button } from '@/src/presentation/components/ui/button'
import { showToast } from '@/src/shared/utils/toast'
import {
  useAtualizarPizzaCategoriaMutation,
  usePizzaCategorias,
  usePizzaSabores,
  usePizzaTamanhos,
  useReordenarPizzaCategoriaMutation,
} from '@/src/presentation/hooks/pizza/usePizza'
import { PizzaCategoriaSetupPanel } from './PizzaCategoriaSetupPanel'
import { PizzaCategoriaTabsModal } from './PizzaCategoriaTabsModal'
import { PizzaSaborModal } from './PizzaSaborModal'
import { PizzaCategoriaSaboresSection } from './PizzaCategoriaSaboresSection'
import { useGestaoPath } from '@/src/presentation/hooks/useGestaoPath'
import type { CategoriaPizza } from '@/src/shared/types/pizza'

function PizzaCategoriaBlock({
  categoria,
  index,
  total,
  isExpanded,
  onToggleExpand,
  onEditar,
  onAdicionarSabor,
  onEditarSabor,
  onToggleAtivo,
  onReordenar,
  savingStatus,
}: {
  categoria: CategoriaPizza
  index: number
  total: number
  isExpanded: boolean
  onToggleExpand: (categoriaId: string) => void
  onEditar: (categoria: CategoriaPizza) => void
  onAdicionarSabor: (categoria: CategoriaPizza) => void
  onEditarSabor: (categoria: CategoriaPizza, saborId: string) => void
  onToggleAtivo: (categoria: CategoriaPizza, ativo: boolean) => void
  onReordenar: (categoria: CategoriaPizza, direction: 'up' | 'down') => void
  savingStatus: boolean
}) {
  const { data: tamanhosData } = usePizzaTamanhos(categoria.id)
  const tamanhosTotal = tamanhosData?.count ?? tamanhosData?.items?.length ?? 0
  const { data: saboresData } = usePizzaSabores(categoria.id)
  const saboresCount = saboresData?.count ?? saboresData?.items?.length ?? 0

  const reorderActions = (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        className="rounded p-1 text-secondary-text hover:bg-gray-100 disabled:opacity-30"
        disabled={index === 0 || savingStatus}
        aria-label="Subir categoria"
        onClick={e => {
          e.stopPropagation()
          onReordenar(categoria, 'up')
        }}
      >
        <MdArrowUpward size={16} />
      </button>
      <button
        type="button"
        className="rounded p-1 text-secondary-text hover:bg-gray-100 disabled:opacity-30"
        disabled={index === total - 1 || savingStatus}
        aria-label="Descer categoria"
        onClick={e => {
          e.stopPropagation()
          onReordenar(categoria, 'down')
        }}
      >
        <MdArrowDownward size={16} />
      </button>
    </div>
  )

  return (
    <div className="space-y-1">
      <div className="sticky top-0 z-20 -mx-1 bg-gray-50 py-1">
        <CatalogGroupHeader
          grupo={categoria.nome}
          grupoId={categoria.id}
          groupKey={categoria.id}
          grupoVisual={{ corHex: categoria.corHex, iconName: categoria.iconName }}
          grupoAtivo={categoria.ativo}
          itemCount={saboresCount}
          itemCountSubtitle={`${saboresCount} sabor${saboresCount === 1 ? '' : 'es'}`}
          isExpanded={isExpanded}
          addProdutoLabel="Adicionar item"
          extraActions={reorderActions}
          onToggleExpand={onToggleExpand}
          onEditGrupo={() => onEditar(categoria)}
          onToggleGrupoStatus={() => onToggleAtivo(categoria, !categoria.ativo)}
          onAddProduto={() => {
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
      ) : (
        <PizzaCategoriaSaboresSection
          categoria={categoria}
          tamanhosTotal={tamanhosTotal}
          onEditarSabor={saborId => onEditarSabor(categoria, saborId)}
        />
      )}
    </div>
  )
}

export function PizzasHubPage() {
  const router = useRouter()
  const { toGestao } = useGestaoPath()
  const { data, isLoading, isError, refetch } = usePizzaCategorias({ limit: 50 })
  const atualizarCategoria = useAtualizarPizzaCategoriaMutation()
  const reordenarCategoria = useReordenarPizzaCategoriaMutation()

  const [setupOpen, setSetupOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editCategoriaId, setEditCategoriaId] = useState<string | null>(null)
  const [saborModalOpen, setSaborModalOpen] = useState(false)
  const [categoriaSabor, setCategoriaSabor] = useState<CategoriaPizza | null>(null)
  const [saborEditId, setSaborEditId] = useState<string | null>(null)
  const [savingCategoriaId, setSavingCategoriaId] = useState<string | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

  const categorias = data?.items ?? []

  useEffect(() => {
    const main = document.querySelector('main')
    if (!main) return
    main.classList.add('scrollbar-hide')
    return () => {
      main.classList.remove('scrollbar-hide')
    }
  }, [])

  const handleToggleExpand = useCallback((categoriaId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [categoriaId]: prev[categoriaId] === false,
    }))
  }, [])

  const handleToggleAtivo = async (categoria: CategoriaPizza, ativo: boolean) => {
    setSavingCategoriaId(categoria.id)
    try {
      await atualizarCategoria.mutateAsync({ id: categoria.id, patch: { ativo } })
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Erro ao atualizar categoria')
    } finally {
      setSavingCategoriaId(null)
    }
  }

  const handleReordenarCategoria = async (
    categoria: CategoriaPizza,
    direction: 'up' | 'down'
  ) => {
    const index = categorias.findIndex(c => c.id === categoria.id)
    if (index < 0) return
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= categorias.length) return

    setSavingCategoriaId(categoria.id)
    try {
      await reordenarCategoria.mutateAsync({
        id: categoria.id,
        novaPosicao: targetIndex + 1,
      })
      await refetch()
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Erro ao reordenar categoria')
    } finally {
      setSavingCategoriaId(null)
    }
  }

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

  const header = useMemo(
    () => (
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-1 py-4 md:px-[30px]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push(toGestao('/produtos'))}
            className="rounded-lg p-2 text-secondary-text hover:bg-gray-100"
            aria-label="Voltar para produtos"
          >
            <MdArrowBack size={20} />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-primary-text">Pizzas</h1>
            <p className="text-xs text-secondary-text">
              Configure categorias, tamanhos, massas, bordas e sabores.
            </p>
          </div>
        </div>
        <Button variant="contained" onClick={() => setSetupOpen(true)}>
          + Nova categoria pizza
        </Button>
      </div>
    ),
    [router, toGestao]
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-gray-50">
      {header}

      <div className="flex-1 px-1 pb-4 pt-2 md:px-[30px] md:pb-6">
        {isLoading ? (
          <JiffyLoading text="Carregando categorias pizza..." />
        ) : isError ? (
          <div className="rounded-xl border border-error/20 bg-white p-6 text-center">
            <p className="text-sm text-error">Não foi possível carregar as categorias pizza.</p>
            <Button variant="outlined" className="mt-4" onClick={() => void refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : categorias.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <p className="text-sm text-secondary-text">
              Nenhuma categoria pizza cadastrada. Comece configurando tamanhos, massas e bordas.
            </p>
            <Button variant="contained" className="mt-4" onClick={() => setSetupOpen(true)}>
              Criar primeira categoria
            </Button>
          </div>
        ) : (
          <div
            role="list"
            aria-label="Categorias pizza"
            className="flex w-full flex-col space-y-4 pb-4"
          >
            {categorias.map((categoria, index) => (
              <div key={categoria.id} role="listitem">
                <PizzaCategoriaBlock
                  categoria={categoria}
                  index={index}
                  total={categorias.length}
                  isExpanded={expandedGroups[categoria.id] !== false}
                  onToggleExpand={handleToggleExpand}
                  savingStatus={savingCategoriaId === categoria.id}
                  onToggleAtivo={handleToggleAtivo}
                  onReordenar={handleReordenarCategoria}
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

      <PizzaCategoriaTabsModal
        open={editOpen}
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
