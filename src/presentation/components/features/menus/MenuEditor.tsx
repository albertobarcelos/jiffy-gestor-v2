'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { InputAdornment, TextField } from '@mui/material'
import { MdArrowBack, MdSearch } from 'react-icons/md'
import { useMenu } from '@/src/presentation/hooks/menus/useMenus'
import {
  useMenuGruposProdutos,
  useMenuProdutos,
} from '@/src/presentation/hooks/menus/useMenuCatalog'
import { useMenuProdutosFilters } from '@/src/presentation/hooks/menus/useMenuProdutosFilters'
import { useMenuMutations } from '@/src/presentation/hooks/menus/useMenuMutations'
import { usePropagarAlteracaoProduto } from '@/src/presentation/hooks/produtos/usePropagarAlteracaoProduto'
import { useEntityImageCropUpload } from '@/src/presentation/hooks/useEntityImageCropUpload'
import { MENU_PRODUTO_CROP_PRESET } from '@/src/presentation/constants/imageCropPresets'
import { useGruposComplementos } from '@/src/presentation/hooks/useGruposComplementos'
import { useIsMobile } from '@/src/presentation/hooks/useIsMobile'
import { AddProdutosToMenuPanel } from './AddProdutosToMenuPanel'
import { MenuNovoProdutoWizard } from './MenuNovoProdutoWizard'
import { MenuCardapioAcoes } from './MenuCardapioAcoes'
import { MenuCardapioEmptyState } from './MenuCardapioEmptyState'
import { MenuProdutosFilters } from './MenuProdutosFilters'
import {
  MenuProdutoTabsModal,
  type MenuProdutoTabsKey,
  type MenuProdutoTabsModalState,
} from './MenuProdutoTabsModal'
import {
  EscolherTipoProdutoModal,
  useEscolherTipoProdutoCadastro,
} from '@/src/presentation/components/features/produtos/EscolherTipoProdutoModal'
import { CatalogGroupedList } from '@/src/presentation/components/features/catalogo/CatalogGroupedList'
import { CatalogProductRow } from '@/src/presentation/components/features/catalogo/CatalogProductRow'
import type { CatalogGroup } from '@/src/presentation/components/features/catalogo/types'
import { MenuProdutoRowQuickActions } from './MenuProdutoRowQuickActions'
import { sxEntradaCompactaProduto } from '@/src/presentation/components/features/produtos/NovoProduto/produtoFormMuiSx'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { showToast } from '@/src/shared/utils/toast'
import { useGestaoPath } from '@/src/presentation/hooks/useGestaoPath'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import type {
  MenuGrupoProduto,
  MenuProduto,
  UpdateMenuProdutoInput,
} from '@/src/shared/types/menus'
import type { SnapshotProdutoPropagavel } from '@/src/shared/types/propagarAlteracaoProduto'

interface MenuEditorProps {
  menuId: string
}

export function MenuEditor({ menuId }: MenuEditorProps) {
  const { toGestao } = useGestaoPath()
  const isMobile = useIsMobile()
  const { state: filters, query, temFiltroAtivo, actions } = useMenuProdutosFilters()
  const [filtrosVisiveis, setFiltrosVisiveis] = useState(false)
  useEffect(() => {
    setFiltrosVisiveis(!isMobile)
  }, [isMobile])

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
    q: query.q,
    ativo: query.ativo,
    favorito: query.favorito,
    grupoProdutoId: query.grupoProdutoId,
    grupoComplementosId: query.grupoComplementosId,
    tipo: query.tipo,
  })
  const [addOpen, setAddOpen] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardCategoriaId, setWizardCategoriaId] = useState<string | undefined>()
  const tipoCadastro = useEscolherTipoProdutoCadastro()
  const {
    data: produtosTodosData,
    fetchNextPage: fetchNextTodos,
    hasNextPage: hasNextTodos,
    isFetching: isFetchingTodos,
    isFetchingNextPage: isFetchingNextTodos,
  } = useMenuProdutos({
    menuId,
    ativo: null,
    tipo: 'all',
    enabled: addOpen,
  })
  const { data: gruposComplementos = [], isLoading: isLoadingGruposComplementos } =
    useGruposComplementos({ limit: 100, ativo: null })
  const { syncProdutos, updateProduto, uploadImagemProduto } = useMenuMutations(menuId)
  const { pedirConfirmacao, aplicarNosDestinos, aplicarImagemNosDestinos, dialog: dialogPropagacao } =
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

  useEffect(() => {
    if (addOpen && hasNextTodos && !isFetchingNextTodos && !isFetchingTodos && produtosTodosData) {
      void fetchNextTodos()
    }
  }, [
    addOpen,
    hasNextTodos,
    isFetchingNextTodos,
    isFetchingTodos,
    fetchNextTodos,
    produtosTodosData,
  ])

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [tabsState, setTabsState] = useState<MenuProdutoTabsModalState>({
    open: false,
    tab: 'produto',
    produto: null,
    grupo: null,
  })

  const openWizardCadastro = useCallback((categoriaId?: string) => {
    setWizardCategoriaId(categoriaId)
    setWizardOpen(true)
  }, [])

  const closeWizardCadastro = useCallback(() => {
    setWizardOpen(false)
    setWizardCategoriaId(undefined)
  }, [])

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

  const idsNoMenu = useMemo(() => {
    const source = addOpen ? produtosTodosData?.pages : produtosData?.pages
    const ids = new Set<string>()
    for (const page of source ?? []) {
      for (const produto of page.items) ids.add(produto.produtoId)
    }
    return ids
  }, [addOpen, produtosTodosData?.pages, produtosData?.pages])

  const gruposDoMenu = useMemo(() => {
    const map = new Map<string, { id: string; nome: string }>()
    for (const grupo of grupos) {
      const id = grupo.grupoBase.id
      if (!map.has(id)) {
        map.set(id, { id, nome: grupo.nome || grupo.grupoBase.nome })
      }
    }
    return Array.from(map.values())
  }, [grupos])

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
        grupoLabel: items[0]?.grupoProduto?.nome || 'Categoria',
        grupoId: baseId,
        grupoAtivo: true,
        items,
      })
    }

    const semGrupo = produtosPorGrupo.get('sem-grupo')
    if (semGrupo?.length) {
      groups.push({
        groupKey: 'sem_grupo',
        grupoLabel: 'Sem categoria',
        grupoAtivo: true,
        items: semGrupo,
      })
    }

    return groups
  }, [grupos, produtosPorGrupo])

  const catalogGroupsVisiveis = useMemo(() => {
    if (!temFiltroAtivo) return catalogGroups
    return catalogGroups.filter(grupo => grupo.items.length > 0)
  }, [catalogGroups, temFiltroAtivo])

  useEffect(() => {
    setExpandedGroups(prev => {
      let changed = false
      const next: Record<string, boolean> = {}
      catalogGroupsVisiveis.forEach(({ groupKey }) => {
        if (typeof prev[groupKey] === 'undefined') {
          changed = true
          next[groupKey] = true
        } else next[groupKey] = prev[groupKey]
      })
      return changed ? next : prev
    })
  }, [catalogGroupsVisiveis])

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
      tipoCadastro.pedirTipo(() => openWizardCadastro(grupoId))
    },
    [tipoCadastro.pedirTipo, openWizardCadastro]
  )
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

  const handleQuickPatch = useCallback(
    async (produtoId: string, input: UpdateMenuProdutoInput): Promise<boolean> => {
      const destinos = await pedirConfirmacao({
        origem: 'menu',
        produtoId,
        menuIdAtual: menuId,
      })
      if (destinos === null) return false
      try {
        await updateProduto.mutateAsync({ produtoId, input })
        const snapshot = input as SnapshotProdutoPropagavel
        if (destinos.aplicarNoCadastroBase || destinos.menuIds.length > 0) {
          await aplicarNosDestinos({
            produtoId,
            snapshot,
            destinos,
          })
        }
        if (input.favorito !== undefined) {
          showToast.success(
            input.favorito ? 'Marcado como favorito neste cardápio' : 'Removido dos favoritos'
          )
        } else if (input.descricao !== undefined) {
          showToast.success('Descrição atualizada neste cardápio')
        } else if (input.gruposComplementosIds !== undefined) {
          showToast.success('Complementos atualizados neste cardápio')
        } else {
          showToast.success('Produto atualizado neste cardápio')
        }
        return true
      } catch (err) {
        showToast.error(err instanceof Error ? err.message : 'Erro ao atualizar produto')
        return false
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

  const handleUploadImagem = useCallback(
    async (produtoId: string, file: File) => {
      try {
        await uploadImagemProduto.mutateAsync({ produtoId, file })
        const destinos = await pedirConfirmacao({
          origem: 'menu',
          produtoId,
          menuIdAtual: menuId,
          variante: 'imagem',
        })
        if (destinos && destinos.menuIds.length > 0) {
          await aplicarImagemNosDestinos({
            produtoId,
            file,
            destinos,
            vincularSeAusente: true,
          })
          showToast.success('Imagem atualizada neste cardápio e nos selecionados')
        } else {
          showToast.success('Imagem atualizada neste cardápio')
        }
      } catch (err) {
        showToast.error(err instanceof Error ? err.message : 'Erro ao atualizar imagem')
      }
    },
    [uploadImagemProduto, pedirConfirmacao, aplicarImagemNosDestinos, menuId]
  )

  const { selectForEntity: selectProdutoImagem, cropModal: produtoCropModal } =
    useEntityImageCropUpload({
      preset: MENU_PRODUTO_CROP_PRESET,
      upload: handleUploadImagem,
    })

  const handleChangeImage = useCallback(
    (produtoId: string, file: File) => {
      selectProdutoImagem(produtoId, file)
    },
    [selectProdutoImagem]
  )

  const renderItem = useCallback(
    (produto: MenuProduto) => {
      const savingThis =
        updateProduto.isPending && updateProduto.variables?.produtoId === produto.produtoId
      const savingImage =
        uploadImagemProduto.isPending &&
        uploadImagemProduto.variables?.produtoId === produto.produtoId
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
          isSavingImage={savingImage}
          onValorChange={handleValorChange}
          onSwitchToggle={handleStatusToggle}
          onEdit={handleEditProduto}
          onRemove={handleRemove}
          onChangeImage={handleChangeImage}
          actionsSlot={
            <MenuProdutoRowQuickActions
              produto={produto}
              disabled={savingThis}
              onPatch={handleQuickPatch}
            />
          }
        />
      )
    },
    [
      updateProduto.isPending,
      updateProduto.variables,
      uploadImagemProduto.isPending,
      uploadImagemProduto.variables,
      handleValorChange,
      handleStatusToggle,
      handleEditProduto,
      handleRemove,
      handleChangeImage,
      handleQuickPatch,
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
  const cardapioVazio = !temFiltroAtivo && produtosDoMenu.length === 0
  const mostrarAcoesCabecalho = !cardapioVazio

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-shrink-0 px-1 py-[4px] md:px-[30px]">
        <div className="flex flex-wrap items-end justify-between gap-4">
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

          <div className="mb-1 w-full max-w-[350px]">
            <TextField
              id="menu-produtos-search"
              size="small"
              fullWidth
              value={filters.searchText}
              onChange={e => actions.setSearch(e.target.value)}
              label="Pesquisar"
              placeholder="Nome ou descrição"
              InputLabelProps={{ shrink: true }}
              sx={{
                ...sxEntradaCompactaProduto,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#fff',
                  height: 32,
                  minHeight: 32,
                },
                '& .MuiOutlinedInput-input': {
                  padding: '4px 8px',
                  fontSize: '0.8125rem',
                },
                '& .MuiInputAdornment-root': {
                  marginRight: '2px',
                },
                '& .MuiInputLabel-root': {
                  fontSize: '0.8125rem',
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <MdSearch className="text-secondary-text" size={16} />
                  </InputAdornment>
                ),
              }}
            />
          </div>

          {mostrarAcoesCabecalho ? (
            <MenuCardapioAcoes
              onCadastrar={() => tipoCadastro.pedirTipo(() => openWizardCadastro())}
              onAdicionar={() => setAddOpen(true)}
            />
          ) : null}
        </div>
      </div>

      <div className="h-[4px] flex-shrink-0 border-t-2 border-primary/50" />

      <MenuProdutosFilters
        filtrosVisiveis={filtrosVisiveis}
        isMobile={isMobile}
        onToggleFiltros={() => setFiltrosVisiveis(v => !v)}
        filterStatus={filters.filterStatus}
        onFilterStatusChange={actions.setStatus}
        favoritoFilter={filters.favoritoFilter}
        onFavoritoChange={actions.setFavorito}
        tipo={filters.tipo}
        onTipoChange={actions.setTipo}
        grupoProdutoId={filters.grupoProdutoId}
        onGrupoProdutoChange={actions.setGrupo}
        gruposDoMenu={gruposDoMenu}
        grupoComplementosId={filters.grupoComplementosId}
        onGrupoComplementoChange={actions.setGrupoComplemento}
        gruposComplementos={gruposComplementos}
        isLoadingGruposComplementos={isLoadingGruposComplementos}
        onClearFilters={actions.reset}
      />

      <div className="mt-2 min-h-0 flex-1 overflow-y-auto px-1 scrollbar-hide">
        <CatalogGroupedList
          groups={catalogGroupsVisiveis}
          getItemKey={item => item.produtoId}
          renderItem={renderItem}
          expandedGroups={expandedGroups}
          isLoading={isLoadingList && catalogGroupsVisiveis.length === 0}
          emptyLabel="Nenhum produto encontrado com esses filtros."
          emptyContent={
            cardapioVazio && !isLoadingList ? (
              <MenuCardapioEmptyState
                onCadastrar={() => tipoCadastro.pedirTipo(() => openWizardCadastro())}
                onAdicionar={() => setAddOpen(true)}
              />
            ) : undefined
          }
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

      <AddProdutosToMenuPanel
        open={addOpen}
        menuId={menuId}
        produtosJaNoMenu={idsNoMenu}
        onClose={() => setAddOpen(false)}
      />

      <EscolherTipoProdutoModal
        open={tipoCadastro.open}
        onClose={tipoCadastro.fechar}
        onContinuar={tipoCadastro.continuar}
      />
      <MenuNovoProdutoWizard
        open={wizardOpen}
        menuId={menuId}
        menuNome={menu.nome}
        initialCategoriaId={wizardCategoriaId}
        onClose={closeWizardCadastro}
      />
      {dialogPropagacao}
      {produtoCropModal}
    </div>
  )
}
