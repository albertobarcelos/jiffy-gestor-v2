'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MdArrowBack, MdArrowDownward, MdArrowUpward, MdEdit } from 'react-icons/md'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { Button } from '@/src/presentation/components/ui/button'
import { showToast } from '@/src/shared/utils/toast'
import { DinamicIcon } from '@/src/shared/utils/iconRenderer'
import { ProdutoStatusSwitch } from '@/src/presentation/components/features/produtos/ProdutosList/ProdutoStatusSwitch'
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

function PizzaCategoriaCard({
  categoria,
  index,
  total,
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
  onEditar: (categoria: CategoriaPizza) => void
  onAdicionarSabor: (categoria: CategoriaPizza) => void
  onEditarSabor: (categoria: CategoriaPizza, saborId: string) => void
  onToggleAtivo: (categoria: CategoriaPizza, ativo: boolean) => void
  onReordenar: (categoria: CategoriaPizza, direction: 'up' | 'down') => void
  savingStatus: boolean
}) {
  const { data: tamanhosData } = usePizzaTamanhos(categoria.id)
  const tamanhosCount = tamanhosData?.count ?? tamanhosData?.items?.length ?? 0
  const { data: saboresData } = usePizzaSabores(categoria.id)
  const vazia = (saboresData?.count ?? 0) === 0

  return (
    <div className="space-y-1">
      <div className="sticky top-0 z-20 -mx-1 bg-gray-50 py-1">
        <header className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm md:px-6">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border"
            style={{ borderColor: categoria.corHex }}
          >
            <DinamicIcon iconName={categoria.iconName} color={categoria.corHex} size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-primary-text">{categoria.nome}</h2>
              {vazia ? (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary-text">
                  Categoria vazia
                </span>
              ) : null}
            </div>
            <p className="text-xs text-secondary-text">
              {saboresData?.count ?? saboresData?.items?.length ?? 0} sabor
              {(saboresData?.count ?? saboresData?.items?.length ?? 0) === 1 ? '' : 'es'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <button
              type="button"
              disabled={tamanhosCount === 0}
              onClick={() => onAdicionarSabor(categoria)}
              className="flex h-8 items-center gap-1 rounded-lg border border-primary/50 bg-info px-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60 md:px-5 md:text-sm"
              title={
                tamanhosCount === 0
                  ? 'Configure tamanhos na categoria antes de adicionar sabores'
                  : undefined
              }
            >
              Adicionar item
              <span className="text-sm leading-none">+</span>
            </button>
            <div className="flex items-center gap-1">
            <button
              type="button"
              className="rounded p-1 text-secondary-text hover:bg-gray-100 disabled:opacity-30"
              disabled={index === 0 || savingStatus}
              aria-label="Subir categoria"
              onClick={() => onReordenar(categoria, 'up')}
            >
              <MdArrowUpward size={18} />
            </button>
            <button
              type="button"
              className="rounded p-1 text-secondary-text hover:bg-gray-100 disabled:opacity-30"
              disabled={index === total - 1 || savingStatus}
              aria-label="Descer categoria"
              onClick={() => onReordenar(categoria, 'down')}
            >
              <MdArrowDownward size={18} />
            </button>
            <button
              type="button"
              className="rounded p-1 text-primary hover:bg-primary/5"
              aria-label="Editar categoria"
              onClick={() => onEditar(categoria)}
            >
              <MdEdit size={18} />
            </button>
            </div>
          </div>
          <ProdutoStatusSwitch
            isAtivo={categoria.ativo}
            disabled={savingStatus}
            onChange={ativo => onToggleAtivo(categoria, ativo)}
          />
        </header>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <PizzaCategoriaSaboresSection
          categoria={categoria}
          tamanhosCount={tamanhosCount}
          onEditarSabor={saborId => onEditarSabor(categoria, saborId)}
        />
      </section>
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

  const categorias = data?.items ?? []

  useEffect(() => {
    const main = document.querySelector('main')
    if (!main) return
    main.classList.add('scrollbar-hide')
    return () => {
      main.classList.remove('scrollbar-hide')
    }
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
          <div className="flex w-full flex-col space-y-4 pb-4">
            {categorias.map((categoria, index) => (
              <PizzaCategoriaCard
                key={categoria.id}
                categoria={categoria}
                index={index}
                total={categorias.length}
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
