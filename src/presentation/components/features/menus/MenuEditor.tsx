'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { MdArrowBack } from 'react-icons/md'
import { useMenu } from '@/src/presentation/hooks/menus/useMenus'
import {
  useMenuGruposProdutos,
  useMenuProdutos,
} from '@/src/presentation/hooks/menus/useMenuCatalog'
import { useMenuMutations } from '@/src/presentation/hooks/menus/useMenuMutations'
import { usePropagarAlteracaoProduto } from '@/src/presentation/hooks/produtos/usePropagarAlteracaoProduto'
import { AddProdutosToMenuPanel } from './AddProdutosToMenuPanel'
import {
  MenuProdutoTabsModal,
  type MenuProdutoTabsKey,
  type MenuProdutoTabsModalState,
} from './MenuProdutoTabsModal'
import {
  ProdutosTabsModal,
  type ProdutosTabsModalState,
} from '@/src/presentation/components/features/produtos/ProdutosTabsModal'
import { CatalogGroupedList } from '@/src/presentation/components/features/catalogo/CatalogGroupedList'
import { CatalogProductRow } from '@/src/presentation/components/features/catalogo/CatalogProductRow'
import type { CatalogGroup } from '@/src/presentation/components/features/catalogo/types'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { showToast } from '@/src/shared/utils/toast'
import { useGestaoPath } from '@/src/presentation/hooks/useGestaoPath'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import type { MenuGrupoProduto, MenuProduto } from '@/src/shared/types/menus'

interface MenuEditorProps {
  menuId: string
}

export function MenuEditor({ menuId }: MenuEditorProps) {
  const { toGestao } = useGestaoPath()
  const { data: menu, isLoading: loadingMenu } = useMenu(menuId)
  const {
    data: gruposData,
    isLoading: loadingGrupos,
    fetchNextPage: fetchNextGrupos,
    hasNextPage: hasNextGrupos,
    isFetching: isFetchingGrupos,
    isFetchingNextPage: isFetchingNextGrupos,
  } = useMenuGruposProdutos({
    menuId,
  })
  const {
    data: produtosData,
    isLoading: loadingProdutos,
    fetchNextPage: fetchNextProdutos,
    hasNextPage: hasNextProdutos,
    isFetching: isFetchingProdutos,
    isFetchingNextPage: isFetchingNextProdutos,
  } = useMenuProdutos({
    menuId,
    ativo: null,
  })
  const { syncProdutos, updateProduto } = useMenuMutations(menuId)
  const { pedirConfirmacao, aplicarNosDestinos, dialog: dialogPropagacao } =
    usePropagarAlteracaoProduto()
  const invalidate = useInvalidateTenantQueries()

  useEffect(() => {
    if (hasNextProdutos && !isFetchingNextProdutos && !isFetchingProdutos && produtosData) {
      void fetchNextProdutos()
    }
  }, [
    hasNextProdutos,
    isFetchingNextProdutos,
    isFetchingProdutos,
    fetchNextProdutos,
    produtosData,
  ])

  useEffect(() => {
    if (hasNextGrupos && !isFetchingNextGrupos && !isFetchingGrupos && gruposData) {
      void fetchNextGrupos()
    }
  }, [hasNextGrupos, isFetchingNextGrupos, isFetchingGrupos, fetchNextGrupos, gruposData])

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [addOpen, setAddOpen] = useState(false)
  const [tabsState, setTabsState] = useState<MenuProdutoTabsModalState>({
    open: false,
    tab: 'produto',
    produto: null,
    grupo: null,
  })
  const [createProdutoState, setCreateProdutoState] = useState<ProdutosTabsModalState>({
    open: false,
    tab: 'produto',
    mode: 'create',
  })

  const grupos = useMemo(() => {
    const map = new Map<string, MenuGrupoProduto>()
    for (const page of gruposData?.pages ?? []) {
      for (const grupo of page.items) {
        if (!map.has(grupo.id)) map.set(grupo.id, grupo)
      }
    }
    return Array.from(map.values()).sort((a, b) => a.ordem - b.ordem)
  }, [gruposData?.pages])

  const produtosDoMenu = useMemo(() => {
    const map = new Map<string, MenuProduto>()
    for (const page of produtosData?.pages ?? []) {
      for (const produto of page.items) {
        if (!map.has(produto.produtoId)) map.set(produto.produtoId, produto)
      }
    }
    return Array.from(map.values())
  }, [produtosData?.pages])

  const produtosPorGrupo = useMemo(() => {
    const map = new Map<string, MenuProduto[]>()
    for (const produto of produtosDoMenu) {
      const key = produto.grupoProduto?.id ?? 'sem-grupo'
      const list = map.get(key) ?? []
      list.push(produto)
      map.set(key, list)
    }
    for (const [, list] of map) {
      list.sort((a, b) => a.ordem - b.ordem)
    }
    return map
  }, [produtosDoMenu])

  const catalogGroups = useMemo<CatalogGroup<MenuProduto>[]>(() => {
    const used = new Set<string>()
    const groups: CatalogGroup<MenuProduto>[] = grupos.map(grupo => {
      const baseId = grupo.grupoBase.id
      used.add(baseId)
      const cor = grupo.grupoBase.corHex
      const icon = grupo.grupoBase.iconName
      return {
        groupKey: `gid:${baseId}`,
        grupoLabel: grupo.nome || grupo.grupoBase.nome,
        grupoId: baseId,
        grupoVisual:
          cor && icon ? { corHex: cor, iconName: icon } : undefined,
        grupoAtivo: grupo.grupoBase.ativo ?? true,
        items: produtosPorGrupo.get(baseId) ?? [],
      }
    })

    for (const [baseId, items] of produtosPorGrupo) {
      if (used.has(baseId) || baseId === 'sem-grupo') continue
      groups.push({
        groupKey: `gid:${baseId}`,
        grupoLabel: items[0]?.grupoProduto?.nome || 'Grupo',
        grupoId: baseId,
        grupoAtivo: true,
        items,
      })
    }

    const semGrupo = produtosPorGrupo.get('sem-grupo')
    if (semGrupo?.length) {
      groups.push({
        groupKey: 'sem_grupo',
        grupoLabel: 'Sem grupo',
        grupoAtivo: true,
        items: semGrupo,
      })
    }

    return groups
  }, [grupos, produtosPorGrupo])

  useEffect(() => {
    setExpandedGroups(prev => {
      let changed = false
      const next: Record<string, boolean> = {}
      catalogGroups.forEach(({ groupKey }) => {
        if (typeof prev[groupKey] === 'undefined') {
          changed = true
          next[groupKey] = true
        } else next[groupKey] = prev[groupKey]
      })
      return changed ? next : prev
    })
  }, [catalogGroups])

  const findGrupo = useCallback(
    (grupoBaseId: string | undefined) =>
      grupos.find(g => g.grupoBase.id === grupoBaseId) ?? null,
    [grupos]
  )

  const handleToggleExpand = useCallback((groupKey: string) => {
    setExpandedGroups(prev => {
      const currentlyExpanded = prev[groupKey] !== false
      return { ...prev, [groupKey]: !currentlyExpanded }
    })
  }, [])

  const openTabs = useCallback(
    (config: Partial<MenuProdutoTabsModalState> & { tab: MenuProdutoTabsKey }) => {
      setTabsState(prev => ({
        open: true,
        produto: config.produto ?? prev.produto,
        grupo: config.grupo ?? prev.grupo,
        ...config,
      }))
    },
    []
  )

  const closeTabs = useCallback(() => {
    setTabsState({
      open: false,
      tab: 'produto',
      produto: null,
      grupo: null,
    })
  }, [])

  const handleEditProduto = useCallback(
    (produtoId: string) => {
      const produto = produtosDoMenu.find(p => p.produtoId === produtoId)
      if (!produto) return
      openTabs({
        tab: 'produto',
        produto,
        grupo: findGrupo(produto.grupoProduto?.id),
      })
    },
    [produtosDoMenu, findGrupo, openTabs]
  )

  const handleEditGrupo = useCallback(
    (grupoId: string | undefined) => {
      if (!grupoId) return
      const grupo = findGrupo(grupoId)
      if (!grupo) return
      const primeiro = produtosPorGrupo.get(grupoId)?.[0] ?? null
      openTabs({
        tab: 'grupo',
        grupo,
        produto: primeiro,
      })
    },
    [findGrupo, produtosPorGrupo, openTabs]
  )

  const handleAddProduto = useCallback(
    (_grupoNome: string, grupoId: string | undefined) => {
      setCreateProdutoState({
        open: true,
        tab: 'produto',
        mode: 'create',
        prefillGrupoProdutoId: grupoId,
        createMenuIds: [menuId],
      })
    },
    [menuId]
  )

  const closeCreateProduto = useCallback(() => {
    setCreateProdutoState({
      open: false,
      tab: 'produto',
      mode: 'create',
      prefillGrupoProdutoId: undefined,
      createMenuIds: undefined,
    })
  }, [])

  const handleCreateProdutoReload = useCallback(() => {
    void invalidate(['menu-produtos'])
    void invalidate(['menu-grupos'])
    void invalidate(['produtos'])
  }, [invalidate])

  const handleValorChange = useCallback(
    async (produtoId: string, valor: number) => {
      const destinos = await pedirConfirmacao({
        origem: 'menu',
        produtoId,
        menuIdAtual: menuId,
      })
      if (destinos === null) return
      try {
        await updateProduto.mutateAsync({ produtoId, input: { valor } })
        if (destinos.aplicarNoCadastroBase || destinos.menuIds.length > 0) {
          await aplicarNosDestinos({
            produtoId,
            snapshot: { valor },
            destinos,
          })
        }
        showToast.success('Preço atualizado neste cardápio')
      } catch (err) {
        showToast.error(err instanceof Error ? err.message : 'Erro ao atualizar preço')
      }
    },
    [updateProduto, pedirConfirmacao, aplicarNosDestinos, menuId]
  )

  const handleStatusToggle = useCallback(
    async (produtoId: string, ativo: boolean) => {
      const destinos = await pedirConfirmacao({
        origem: 'menu',
        produtoId,
        menuIdAtual: menuId,
      })
      if (destinos === null) return
      try {
        await updateProduto.mutateAsync({ produtoId, input: { ativo } })
        if (destinos.aplicarNoCadastroBase || destinos.menuIds.length > 0) {
          await aplicarNosDestinos({
            produtoId,
            snapshot: { ativo },
            destinos,
          })
        }
        showToast.success(
          ativo ? 'Produto ativo neste cardápio' : 'Produto inativo neste cardápio'
        )
      } catch (err) {
        showToast.error(err instanceof Error ? err.message : 'Erro ao atualizar status')
      }
    },
    [updateProduto, pedirConfirmacao, aplicarNosDestinos, menuId]
  )

  const handleRemove = useCallback(
    (produtoId: string) => {
      const produto = produtosDoMenu.find(p => p.produtoId === produtoId)
      if (!produto) return
      if (!window.confirm(`Remover "${produto.nome}" deste cardápio?`)) return
      void syncProdutos
        .mutateAsync({ remove: [produto.produtoId] })
        .then(() => {
          showToast.success('Produto removido deste cardápio')
          if (tabsState.produto?.produtoId === produto.produtoId) closeTabs()
        })
        .catch(err =>
          showToast.error(err instanceof Error ? err.message : 'Erro ao remover')
        )
    },
    [produtosDoMenu, syncProdutos, tabsState.produto, closeTabs]
  )

  const renderItem = useCallback(
    (produto: MenuProduto) => {
      const savingThis =
        updateProduto.isPending && updateProduto.variables?.produtoId === produto.produtoId
      return (
        <CatalogProductRow
          variant="menu"
          id={produto.produtoId}
          nome={produto.nome}
          valor={Number(produto.valor)}
          ativo={produto.ativo}
          imagemUrl={produto.image?.imageUrl}
          isSavingValor={savingThis && updateProduto.variables?.input.valor !== undefined}
          isSavingStatus={savingThis && updateProduto.variables?.input.ativo !== undefined}
          onValorChange={handleValorChange}
          onSwitchToggle={handleStatusToggle}
          onEdit={handleEditProduto}
          onRemove={handleRemove}
        />
      )
    },
    [
      updateProduto.isPending,
      updateProduto.variables,
      handleValorChange,
      handleStatusToggle,
      handleEditProduto,
      handleRemove,
    ]
  )

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

  const isLoadingList = loadingGrupos || loadingProdutos

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-shrink-0 px-1 py-[4px] md:px-[30px]">
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
              <p className="text-sm font-normal text-tertiary md:text-[22px]">{menu.nome}</p>
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

      <div className="h-[4px] flex-shrink-0 border-t-2 border-primary/50" />

      <div className="mt-2 min-h-0 flex-1 overflow-y-auto px-1 scrollbar-hide">
        <CatalogGroupedList
          groups={catalogGroups}
          getItemKey={item => item.produtoId}
          renderItem={renderItem}
          expandedGroups={expandedGroups}
          isLoading={isLoadingList && catalogGroups.length === 0}
          emptyLabel="Nenhum produto neste cardápio. Use “Adicionar produtos”."
          listAriaLabel="Produtos deste cardápio"
          showGrupoStatusSwitch={false}
          addProdutoLabel="Adicionar produto"
          onToggleExpand={handleToggleExpand}
          onEditGrupo={handleEditGrupo}
          onAddProduto={handleAddProduto}
        />
      </div>

      <MenuProdutoTabsModal
        menuId={menuId}
        state={tabsState}
        onClose={closeTabs}
        onTabChange={tab => setTabsState(prev => ({ ...prev, tab }))}
      />

      <ProdutosTabsModal
        state={createProdutoState}
        onClose={closeCreateProduto}
        onReload={handleCreateProdutoReload}
        onTabChange={tab => setCreateProdutoState(prev => ({ ...prev, tab }))}
      />

      <AddProdutosToMenuPanel
        open={addOpen}
        menuId={menuId}
        produtosJaNoMenu={new Set(produtosDoMenu.map(p => p.produtoId))}
        onClose={() => setAddOpen(false)}
      />
      {dialogPropagacao}
    </div>
  )
}
