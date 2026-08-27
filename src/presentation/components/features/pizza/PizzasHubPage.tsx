'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MdArrowBack } from 'react-icons/md'
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
} from '@/src/presentation/hooks/pizza/usePizza'
import { PizzaCategoriaSetupPanel } from './PizzaCategoriaSetupPanel'
import { PizzaSaborModal } from './PizzaSaborModal'
import { PizzaCategoriaSaboresSection } from './PizzaCategoriaSaboresSection'
import type { CategoriaPizza } from '@/src/shared/types/pizza'

function PizzaCategoriaCard({
  categoria,
  onAdicionarSabor,
  onToggleAtivo,
  savingStatus,
}: {
  categoria: CategoriaPizza
  onAdicionarSabor: (categoria: CategoriaPizza) => void
  onToggleAtivo: (categoria: CategoriaPizza, ativo: boolean) => void
  savingStatus: boolean
}) {
  const { data: tamanhosData } = usePizzaTamanhos(categoria.id)
  const tamanhosCount = tamanhosData?.count ?? tamanhosData?.items?.length ?? 0
  const { data: saboresData } = usePizzaSabores(categoria.id)
  const vazia = (saboresData?.count ?? 0) === 0

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-center gap-3 px-4 py-4 md:px-6">
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
        </div>
        <ProdutoStatusSwitch
          isAtivo={categoria.ativo}
          disabled={savingStatus}
          onChange={ativo => onToggleAtivo(categoria, ativo)}
        />
      </header>

      <PizzaCategoriaSaboresSection
        categoria={categoria}
        tamanhosCount={tamanhosCount}
        onAdicionarSabor={() => onAdicionarSabor(categoria)}
      />
    </section>
  )
}

export function PizzasHubPage() {
  const router = useRouter()
  const { data, isLoading, isError, refetch } = usePizzaCategorias({ limit: 50 })
  const atualizarCategoria = useAtualizarPizzaCategoriaMutation()

  const [setupOpen, setSetupOpen] = useState(false)
  const [saborModalOpen, setSaborModalOpen] = useState(false)
  const [categoriaSabor, setCategoriaSabor] = useState<CategoriaPizza | null>(null)
  const [savingCategoriaId, setSavingCategoriaId] = useState<string | null>(null)

  const categorias = data?.items ?? []

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

  const header = useMemo(
    () => (
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-4 md:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/produtos')}
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
    [router]
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-gray-50">
      {header}

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
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
          <div className="mx-auto flex max-w-5xl flex-col gap-4">
            {categorias.map(categoria => (
              <PizzaCategoriaCard
                key={categoria.id}
                categoria={categoria}
                savingStatus={savingCategoriaId === categoria.id}
                onToggleAtivo={handleToggleAtivo}
                onAdicionarSabor={cat => {
                  setCategoriaSabor(cat)
                  setSaborModalOpen(true)
                }}
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

      <PizzaSaborModal
        open={saborModalOpen}
        categoria={categoriaSabor}
        onClose={() => {
          setSaborModalOpen(false)
          setCategoriaSabor(null)
        }}
        onSuccess={() => void refetch()}
      />
    </div>
  )
}
