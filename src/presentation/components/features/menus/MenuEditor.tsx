'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { MdArrowBack, MdDragIndicator } from 'react-icons/md'
import { useMenu } from '@/src/presentation/hooks/menus/useMenus'
import {
  useMenuGruposProdutos,
  useMenuProdutos,
} from '@/src/presentation/hooks/menus/useMenuCatalog'
import { useMenuMutations } from '@/src/presentation/hooks/menus/useMenuMutations'
import { MenuProdutoPanel } from './MenuProdutoPanel'
import { AddProdutosToMenuPanel } from './AddProdutosToMenuPanel'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { showToast } from '@/src/shared/utils/toast'
import { useGestaoPath } from '@/src/presentation/hooks/useGestaoPath'
import type { MenuProduto } from '@/src/shared/types/menus'

function formatBrl(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

interface MenuEditorProps {
  menuId: string
}

export function MenuEditor({ menuId }: MenuEditorProps) {
  const { toGestao } = useGestaoPath()
  const { data: menu, isLoading: loadingMenu } = useMenu(menuId)
  const { data: gruposData, isLoading: loadingGrupos } = useMenuGruposProdutos({
    menuId,
  })
  const { data: produtosData, isLoading: loadingProdutos } = useMenuProdutos({
    menuId,
  })
  const { syncProdutos } = useMenuMutations(menuId)

  const [selectedGrupoBaseId, setSelectedGrupoBaseId] = useState<string | null>(null)
  const [produtoPanel, setProdutoPanel] = useState<MenuProduto | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  const grupos = useMemo(() => {
    const items = [...(gruposData?.items ?? [])]
    return items.sort((a, b) => a.ordem - b.ordem)
  }, [gruposData?.items])

  const produtosPorGrupo = useMemo(() => {
    const map = new Map<string, MenuProduto[]>()
    for (const produto of produtosData?.items ?? []) {
      const key = produto.grupoProduto?.id ?? 'sem-grupo'
      const list = map.get(key) ?? []
      list.push(produto)
      map.set(key, list)
    }
    for (const [, list] of map) {
      list.sort((a, b) => a.ordem - b.ordem)
    }
    return map
  }, [produtosData?.items])

  const activeGrupoId = selectedGrupoBaseId ?? grupos[0]?.grupoBase?.id ?? null
  const produtosDoGrupo = activeGrupoId
    ? produtosPorGrupo.get(activeGrupoId) ?? []
    : []

  const handleRemove = async (produto: MenuProduto) => {
    if (!window.confirm(`Remover "${produto.nome}" deste cardápio?`)) return
    try {
      await syncProdutos.mutateAsync({ remove: [produto.produtoId] })
      showToast.success('Produto removido deste cardápio')
      if (produtoPanel?.produtoId === produto.produtoId) setProdutoPanel(null)
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : 'Erro ao remover')
    }
  }

  if (loadingMenu) {
    return (
      <div className="flex h-full items-center justify-center">
        <JiffyLoading />
      </div>
    )
  }

  if (!menu) {
    return (
      <div className="p-6">
        <p className="text-sm text-secondary-text">Menu não encontrado.</p>
        <Link
          href={toGestao('/menus')}
          className="mt-2 inline-block text-sm font-semibold text-primary"
        >
          Voltar
        </Link>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-1 py-[4px] md:px-[30px]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3 md:pl-5">
            <Link
              href={toGestao('/menus')}
              className="mt-1 flex h-8 w-8 items-center justify-center rounded-lg border border-primary/50 text-primary transition-colors hover:bg-primary/10"
              aria-label="Voltar"
            >
              <MdArrowBack className="h-5 w-5" />
            </Link>
            <div>
              <p className="text-sm font-semibold text-primary">Cardápio do menu</p>
              <p className="text-sm font-normal text-tertiary md:text-[22px]">
                {menu.nome}
              </p>
             
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex h-8 items-center gap-2 rounded-lg bg-primary px-[30px] text-sm font-semibold text-info transition-colors hover:bg-primary/90"
          >
            Adicionar produtos
            <span className="text-lg">+</span>
          </button>
        </div>
      </div>

      <div className="h-[2px] border-t-2 border-primary/70" />

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[280px_1fr]">
        <aside className="border-b border-gray-100 bg-info lg:border-b-0 lg:border-r">
          <div className="px-4 py-3 text-sm font-semibold text-primary">
            Grupos deste cardápio
          </div>
          {loadingGrupos ? (
            <div className="flex justify-center py-6">
              <JiffyLoading />
            </div>
          ) : grupos.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-secondary-text">
              Nenhum grupo neste cardápio. Adicione produtos para montar os grupos.
            </p>
          ) : (
            <ul className="px-2 pb-2">
              {grupos.map((grupo) => {
                const baseId = grupo.grupoBase.id
                const selected = activeGrupoId === baseId
                const count = produtosPorGrupo.get(baseId)?.length ?? 0
                return (
                  <li key={grupo.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedGrupoBaseId(baseId)}
                      className={`mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                        selected
                          ? 'bg-white font-medium text-primary-text shadow-sm'
                          : 'text-secondary-text hover:bg-white/70'
                      }`}
                    >
                      <MdDragIndicator
                        className="h-4 w-4 shrink-0 text-secondary-text/40"
                        title="Em breve será possível arrastar para reordenar"
                      />
                      <span className="min-w-0 flex-1 truncate">{grupo.nome}</span>
                      <span className="text-xs text-secondary-text">{count}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </aside>

        <section className="flex min-h-0 flex-col bg-white">
          <div className="px-1 pt-2 md:px-4">
            <div className="flex h-10 items-center gap-[10px] rounded-lg bg-custom-2 px-4">
              <div className="flex-[4] text-[10px] font-semibold text-primary-text md:text-sm">
                Produto
              </div>
              <div className="flex-[2] text-[10px] font-semibold text-primary-text md:text-sm">
                Preço
              </div>
              <div className="flex-[2] text-right text-[10px] font-semibold text-primary-text md:text-sm">
                Ações
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-1 pt-1 md:px-4">
            {loadingProdutos ? (
              <div className="flex justify-center py-8">
                <JiffyLoading />
              </div>
            ) : !activeGrupoId ? (
              <p className="py-8 text-center text-sm text-secondary-text">
                Selecione um grupo à esquerda.
              </p>
            ) : produtosDoGrupo.length === 0 ? (
              <p className="py-8 text-center text-sm text-secondary-text">
                Nenhum produto neste grupo. Use “Adicionar produtos”.
              </p>
            ) : (
              produtosDoGrupo.map((produto, index) => {
                const bgColor = index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                return (
                  <div
                    key={produto.id}
                    className={`mb-2 flex items-center gap-[10px] rounded-lg px-4 py-2 md:h-[50px] ${bgColor} transition-colors hover:bg-[var(--color-primary-background)] hover:shadow-md`}
                  >
                    <div className="flex min-w-0 flex-[4] items-center gap-2">
                      <MdDragIndicator
                        className="h-4 w-4 shrink-0 text-secondary-text/40"
                        title="Em breve será possível arrastar para reordenar"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-xs text-primary-text md:text-sm">
                          {produto.nome}
                        </p>
                        <p className="text-[10px] text-secondary-text md:hidden">
                          {formatBrl(Number(produto.valor))}
                        </p>
                      </div>
                    </div>
                    <div className="hidden flex-[2] text-sm text-primary-text md:block">
                      {formatBrl(Number(produto.valor))}
                    </div>
                    <div className="flex flex-[2] justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setProdutoPanel(produto)}
                        className="h-8 rounded-lg border border-primary/50 bg-white px-3 text-xs font-semibold text-primary-text transition-colors hover:bg-primary/10 md:text-sm"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(produto)}
                        className="h-8 rounded-lg border border-primary/50 bg-white px-3 text-xs font-semibold text-primary-text transition-colors hover:bg-primary/10 md:text-sm"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>
      </div>

      <MenuProdutoPanel
        open={Boolean(produtoPanel)}
        menuId={menuId}
        produto={produtoPanel}
        onClose={() => setProdutoPanel(null)}
      />

      <AddProdutosToMenuPanel
        open={addOpen}
        menuId={menuId}
        produtosJaNoMenu={new Set((produtosData?.items ?? []).map((p) => p.produtoId))}
        onClose={() => setAddOpen(false)}
      />
    </div>
  )
}
