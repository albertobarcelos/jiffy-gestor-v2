'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { MdSearch } from 'react-icons/md'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { useProdutos } from '@/src/presentation/hooks/useProdutos'
import {
  useGrupoProdutosRelacionados,
  useSalvarGrupoProdutosRelacionados,
} from '@/src/presentation/hooks/useGrupoProdutosRelacionados'
import { cn } from '@/src/shared/utils/cn'
import type { DesignCategoriaGrupo } from '../../../shared/types/designCategoriaGrupo'
import { omitGrupoSugestoesDaCasaCarrier } from '../../../shared/constants/deliveryPublicoSugestoes'
import { DesignRelacionadoProdutoSortableItem } from '../DesignRelacionadoProdutoSortableItem'

type DesignRelacionadosTabProps = {
  grupos: DesignCategoriaGrupo[]
  isLoading?: boolean
  isError?: boolean
}

export function DesignRelacionadosTab({
  grupos,
  isLoading = false,
  isError = false,
}: DesignRelacionadosTabProps) {
  const gruposListaveis = useMemo(
    () => omitGrupoSugestoesDaCasaCarrier(grupos),
    [grupos]
  )

  const [selectedGrupoId, setSelectedGrupoId] = useState('')
  const [buscaProduto, setBuscaProduto] = useState('')
  const [selectedProdutoIds, setSelectedProdutoIds] = useState<string[]>([])
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (!selectedGrupoId && gruposListaveis.length > 0) {
      setSelectedGrupoId(gruposListaveis[0].id)
    }
  }, [gruposListaveis, selectedGrupoId])

  const relacionadosQuery = useGrupoProdutosRelacionados(selectedGrupoId || null)
  const salvarMutation = useSalvarGrupoProdutosRelacionados(selectedGrupoId || null)

  useEffect(() => {
    if (!relacionadosQuery.data || dirty) return
    setSelectedProdutoIds(relacionadosQuery.data.map(r => r.produtoId))
  }, [relacionadosQuery.data, dirty])

  const produtosQuery = useProdutos({
    ativoDelivery: true,
    limit: 100,
  })

  const produtos = produtosQuery.data?.produtos ?? []

  const produtosFiltrados = useMemo(() => {
    const q = buscaProduto.trim().toLowerCase()
    if (!q) return produtos
    return produtos.filter(produto => {
      const nome = produto.getNome().toLowerCase()
      const codigo = String(produto.getCodigoProduto() ?? '')
      return nome.includes(q) || codigo.includes(q)
    })
  }, [buscaProduto, produtos])

  const selectedGrupo = gruposListaveis.find(g => g.id === selectedGrupoId)

  const relacionadosOrdered = useMemo(() => {
    const byId = new Map(produtos.map(p => [p.getId(), p]))
    const fromServer = relacionadosQuery.data ?? []
    const ordered: Array<{ id: string; nome: string; codigo?: number }> = []

    for (const id of selectedProdutoIds) {
      const fromList = byId.get(id)
      if (fromList) {
        ordered.push({
          id,
          nome: fromList.getNome(),
          codigo: fromList.getCodigoProduto() ?? undefined,
        })
        continue
      }
      const fromRel = fromServer.find(r => r.produtoId === id)
      if (fromRel) {
        ordered.push({
          id,
          nome: fromRel.nome,
          codigo: fromRel.codigoProduto,
        })
      }
    }
    return ordered
  }, [selectedProdutoIds, produtos, relacionadosQuery.data])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const toggleProduto = (produtoId: string) => {
    setDirty(true)
    setSelectedProdutoIds(prev =>
      prev.includes(produtoId)
        ? prev.filter(id => id !== produtoId)
        : [...prev, produtoId]
    )
  }

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setSelectedProdutoIds(prev => {
      const oldIndex = prev.indexOf(String(active.id))
      const newIndex = prev.indexOf(String(over.id))
      if (oldIndex === -1 || newIndex === -1) return prev
      return arrayMove(prev, oldIndex, newIndex)
    })
    setDirty(true)
  }, [])

  const handleSelectGrupo = (grupoId: string) => {
    if (grupoId === selectedGrupoId) return
    setSelectedGrupoId(grupoId)
    setDirty(false)
    setBuscaProduto('')
    setSelectedProdutoIds([])
  }

  const handleSalvar = async () => {
    await salvarMutation.salvar(selectedProdutoIds)
    setDirty(false)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-48 items-center justify-center">
        <JiffyLoading />
      </div>
    )
  }

  if (isError) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        Não foi possível carregar os grupos de produtos.
      </p>
    )
  }

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div>
        <h2 className="text-base font-semibold text-primary-text">Relacionados</h2>
        <p className="mt-1 text-sm text-secondary-text">
          Selecione um grupo e vincule produtos sugeridos no carrossel &quot;Peça
          Também&quot; do carrinho público.
        </p>
      </div>

      <div className="grid min-h-[28rem] grid-cols-1 gap-3 lg:grid-cols-[minmax(12rem,16rem)_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-secondary-text">
            Grupos
          </div>
          <ul className="max-h-[28rem] overflow-y-auto p-1">
            {gruposListaveis.map(grupo => (
              <li key={grupo.id}>
                <button
                  type="button"
                  onClick={() => handleSelectGrupo(grupo.id)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                    selectedGrupoId === grupo.id
                      ? 'bg-primary/10 font-semibold text-primary'
                      : 'text-primary-text hover:bg-gray-50'
                  )}
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: grupo.cor || '#530CA3' }}
                    aria-hidden
                  />
                  <span className="min-w-0 truncate">{grupo.nome}</span>
                </button>
              </li>
            ))}
            {gruposListaveis.length === 0 ? (
              <li className="px-3 py-4 text-sm text-secondary-text">
                Nenhum grupo ativo.
              </li>
            ) : null}
          </ul>
        </aside>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-3 py-2">
            <div>
              <p className="text-sm font-semibold text-primary-text">
                {selectedGrupo?.nome ?? 'Selecione um grupo'}
              </p>
              <p className="text-xs text-secondary-text">
                {selectedProdutoIds.length} produto(s) vinculado(s)
              </p>
            </div>
            <button
              type="button"
              disabled={!selectedGrupoId || !dirty || salvarMutation.isPending}
              onClick={() => void handleSalvar()}
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {salvarMutation.isPending ? 'Salvando…' : 'Salvar'}
            </button>
          </div>

          {!selectedGrupoId ? (
            <p className="p-4 text-sm text-secondary-text">
              Escolha um grupo à esquerda para vincular produtos.
            </p>
          ) : relacionadosQuery.isLoading ? (
            <div className="flex flex-1 items-center justify-center py-10">
              <JiffyLoading />
            </div>
          ) : (
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 md:grid-cols-2">
              <div className="flex min-h-0 flex-col border-b border-gray-100 md:border-b-0 md:border-r">
                <div className="border-b border-gray-100 px-3 py-2">
                  <label className="relative block">
                    <MdSearch className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-text" />
                    <input
                      type="search"
                      value={buscaProduto}
                      onChange={e => setBuscaProduto(e.target.value)}
                      placeholder="Buscar produtos…"
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-8 pr-3 text-sm outline-none focus:border-primary"
                    />
                  </label>
                </div>
                <ul className="max-h-[22rem] flex-1 overflow-y-auto p-2">
                  {produtosQuery.isLoading ? (
                    <li className="flex justify-center py-8">
                      <JiffyLoading />
                    </li>
                  ) : produtosFiltrados.length === 0 ? (
                    <li className="px-2 py-4 text-sm text-secondary-text">
                      Nenhum produto encontrado.
                    </li>
                  ) : (
                    produtosFiltrados.map(produto => {
                      const id = produto.getId()
                      const checked = selectedProdutoIds.includes(id)
                      return (
                        <li
                          key={id}
                          className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm text-primary-text">
                              {produto.getNome()}
                            </p>
                            <p className="text-[11px] text-secondary-text">
                              COD. {produto.getCodigoProduto() ?? '—'}
                            </p>
                          </div>
                          <JiffyIconSwitch
                            checked={checked}
                            onChange={() => toggleProduto(id)}
                            size="xs"
                            inputProps={{
                              'aria-label': checked
                                ? `Remover ${produto.getNome()}`
                                : `Vincular ${produto.getNome()}`,
                            }}
                          />
                        </li>
                      )
                    })
                  )}
                </ul>
              </div>

              <div className="flex min-h-0 flex-col">
                <div className="border-b border-gray-100 px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-secondary-text">
                    Ordem no carrossel
                  </p>
                  <p className="mt-0.5 text-[11px] text-secondary-text">
                    Arraste pelo ☰ para reordenar
                  </p>
                </div>
                <ul className="max-h-[22rem] flex-1 overflow-y-auto p-2">
                  {relacionadosOrdered.length === 0 ? (
                    <li className="px-2 py-4 text-sm text-secondary-text">
                      Nenhum produto vinculado. Ative produtos na lista ao lado.
                    </li>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={relacionadosOrdered.map(item => item.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {relacionadosOrdered.map((item, index) => (
                          <DesignRelacionadoProdutoSortableItem
                            key={item.id}
                            id={item.id}
                            nome={item.nome}
                            codigo={item.codigo}
                            ordem={index + 1}
                            disabled={salvarMutation.isPending}
                            onRemove={toggleProduto}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  )}
                </ul>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
