'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { InputAdornment, TextField } from '@mui/material'
import { MdSearch } from 'react-icons/md'
import { useMenu } from '@/src/presentation/hooks/menus/useMenus'
import {
  useMenuGruposProdutos,
  useMenuProdutos,
} from '@/src/presentation/hooks/menus/useMenuCatalog'
import { useMenuMutations } from '@/src/presentation/hooks/menus/useMenuMutations'
import { useEntityImageCropUpload } from '@/src/presentation/hooks/useEntityImageCropUpload'
import { MENU_GRUPO_CROP_PRESET } from '@/src/presentation/constants/imageCropPresets'
import {
  EscolherTipoProdutoModal,
  useEscolherTipoProdutoCadastro,
} from '@/src/presentation/components/features/produtos/EscolherTipoProdutoModal'
import { CatalogProductRow } from '@/src/presentation/components/features/catalogo/CatalogProductRow'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { JiffyFriendlyAlertDialog } from '@/src/presentation/components/ui/JiffyFriendlyAlertDialog'
import { showToast } from '@/src/shared/utils/toast'
import { useGestaoPath } from '@/src/presentation/hooks/useGestaoPath'
import { sxEntradaCompactaProduto } from '@/src/presentation/components/features/produtos/NovoProduto/produtoFormMuiSx'
import type { MenuGrupoProduto, MenuProduto } from '@/src/shared/types/menus'
import { coletarGruposMenuPorSnapshot } from './ordenarGruposMenuSnapshot'
import { MenuCardapioChrome } from './MenuCardapioChrome'
import { MenuCardapioAcoes } from './MenuCardapioAcoes'
import { MenuCardapioEmptyState } from './MenuCardapioEmptyState'
import { AddCategoriasToMenuPanel } from './AddCategoriasToMenuPanel'
import { MenuCategoriaSnapshotPanel } from './MenuCategoriaSnapshotPanel'
import { MenuNovoProdutoWizard } from './MenuNovoProdutoWizard'
import { MenuReorderCardapioModal } from './reorder/MenuReorderCardapioModal'
import { MENU_MODAL_CANCEL_VARIANT } from './menuPanelConstants'

function imagemUrlMenuGrupo(grupo: MenuGrupoProduto): string | null {
  const snapshot = grupo.image?.imageUrl?.trim()
  if (snapshot) return snapshot
  return grupo.grupoBase.imagemUrl?.trim() || null
}

interface MenuCategoriasEditorProps {
  menuId: string
}

export function MenuCategoriasEditor({ menuId }: MenuCategoriasEditorProps) {
  const { toGestao } = useGestaoPath()
  const { data: menu, isLoading: loadingMenu } = useMenu(menuId)
  const [searchText, setSearchText] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [reorderOpen, setReorderOpen] = useState(false)
  const [grupoEditando, setGrupoEditando] = useState<MenuGrupoProduto | null>(null)
  const [removerGrupo, setRemoverGrupo] = useState<MenuGrupoProduto | null>(null)
  const [removerBusy, setRemoverBusy] = useState(false)
  const tipoCadastro = useEscolherTipoProdutoCadastro()
  const { syncProdutos, uploadImagemGrupo } = useMenuMutations(menuId)

  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchText)
    }, 400)
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [searchText])

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
    fetchNextPage: fetchNextProdutos,
    hasNextPage: hasNextProdutos,
    isFetching: isFetchingProdutos,
    isFetchingNextPage: isFetchingNextProdutos,
  } = useMenuProdutos({
    menuId,
    tipo: 'all',
    ativo: null,
  })

  useEffect(() => {
    if (hasNextGrupos && !isFetchingNextGrupos && !isFetchingGrupos && gruposData) {
      void fetchNextGrupos()
    }
  }, [
    hasNextGrupos,
    isFetchingNextGrupos,
    isFetchingGrupos,
    fetchNextGrupos,
    gruposData,
  ])

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

  const gruposTodos = useMemo(
    () => coletarGruposMenuPorSnapshot(gruposData?.pages),
    [gruposData?.pages]
  )

  const grupos = useMemo(() => {
    const q = debouncedSearch.trim().toLocaleLowerCase('pt-BR')
    if (!q) return gruposTodos
    return gruposTodos.filter(g =>
      (g.nome || g.grupoBase.nome).toLocaleLowerCase('pt-BR').includes(q)
    )
  }, [gruposTodos, debouncedSearch])

  const produtosDoMenu = useMemo(() => {
    const map = new Map<string, MenuProduto>()
    for (const page of produtosData?.pages ?? []) {
      for (const produto of page.items) {
        if (!map.has(produto.produtoId)) map.set(produto.produtoId, produto)
      }
    }
    return Array.from(map.values())
  }, [produtosData?.pages])

  const idsNoMenu = useMemo(
    () => new Set(produtosDoMenu.map(p => p.produtoId)),
    [produtosDoMenu]
  )

  const categoriasJaNoMenu = useMemo(
    () => new Set(gruposTodos.map(g => g.grupoBase.id)),
    [gruposTodos]
  )

  const produtosPorGrupoId = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const produto of produtosDoMenu) {
      const key = produto.grupoProduto?.id
      if (!key) continue
      const list = map.get(key) ?? []
      list.push(produto.produtoId)
      map.set(key, list)
    }
    return map
  }, [produtosDoMenu])

  const handleUploadImagem = useCallback(
    async (grupoProdutoId: string, file: File) => {
      try {
        await uploadImagemGrupo.mutateAsync({ grupoProdutoId, file })
        showToast.success('Imagem atualizada neste cardápio')
      } catch (err) {
        showToast.error(err instanceof Error ? err.message : 'Erro ao atualizar imagem')
      }
    },
    [uploadImagemGrupo]
  )

  const { selectForEntity, cropModal } = useEntityImageCropUpload({
    preset: MENU_GRUPO_CROP_PRESET,
    upload: handleUploadImagem,
  })

  const handleChangeImage = useCallback(
    (grupoProdutoId: string, file: File) => {
      selectForEntity(grupoProdutoId, file)
    },
    [selectForEntity]
  )

  const handleEdit = useCallback(
    (grupoBaseId: string) => {
      const grupo = gruposTodos.find(g => g.grupoBase.id === grupoBaseId)
      if (grupo) setGrupoEditando(grupo)
    },
    [gruposTodos]
  )

  const handleAskRemove = useCallback(
    (grupoBaseId: string) => {
      const grupo = gruposTodos.find(g => g.grupoBase.id === grupoBaseId)
      if (grupo) setRemoverGrupo(grupo)
    },
    [gruposTodos]
  )

  const confirmRemove = useCallback(async () => {
    if (!removerGrupo) return
    const ids = produtosPorGrupoId.get(removerGrupo.grupoBase.id) ?? []
    if (ids.length === 0) {
      showToast.error('Esta categoria não tem produtos neste cardápio')
      setRemoverGrupo(null)
      return
    }
    setRemoverBusy(true)
    try {
      await syncProdutos.mutateAsync({ remove: ids })
      showToast.success('Categoria removida deste cardápio')
      if (grupoEditando?.grupoBase.id === removerGrupo.grupoBase.id) {
        setGrupoEditando(null)
      }
      setRemoverGrupo(null)
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : 'Erro ao remover')
    } finally {
      setRemoverBusy(false)
    }
  }, [removerGrupo, produtosPorGrupoId, syncProdutos, grupoEditando])

  const openWizardCadastro = useCallback(() => {
    setWizardOpen(true)
  }, [])

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
          href={toGestao('/cardapio')}
          className="mt-2 inline-block text-sm font-semibold text-primary"
        >
          Voltar ao cardápio
        </Link>
      </div>
    )
  }

  const vazio = !debouncedSearch && gruposTodos.length === 0
  const mostrarAcoes = !vazio

  return (
    <MenuCardapioChrome
      menuId={menuId}
      nomeMenu={menu.nome}
      aba="categorias"
      toolbar={
        <div className="flex h-8 shrink-0 items-center gap-2">
          <div className="w-[min(220px,22vw)] shrink-0">
            <TextField
              id="menu-categorias-search"
              size="small"
              fullWidth
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="Pesquisar"
              sx={{
                ...sxEntradaCompactaProduto,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#fff',
                  height: 32,
                  minHeight: 32,
                },
                '& .MuiOutlinedInput-input': {
                  padding: '4px 6px',
                  fontSize: '0.8125rem',
                },
                '& .MuiInputAdornment-root': {
                  marginRight: '2px',
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
          {mostrarAcoes ? (
            <MenuCardapioAcoes
              onAdicionar={() => setAddOpen(true)}
              onReordenar={() => setReorderOpen(true)}
              adicionarLabel="Adicionar categorias"
            />
          ) : null}
        </div>
      }
    >
      <div className="mt-2 min-h-0 flex-1 overflow-y-auto px-1 scrollbar-hide">
        {loadingGrupos && gruposTodos.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <JiffyLoading />
          </div>
        ) : vazio ? (
          <MenuCardapioEmptyState
            onAdicionar={() => setAddOpen(true)}
            adicionarLabel="Adicionar categorias"
            imageAlt="Este cardápio ainda não tem categorias"
          />
        ) : grupos.length === 0 ? (
          <p className="py-10 text-center text-sm text-secondary-text">
            Nenhuma categoria encontrada com essa pesquisa.
          </p>
        ) : (
          <div className="flex flex-col gap-1" role="list" aria-label="Categorias deste cardápio">
            {grupos.map(grupo => {
              const grupoId = grupo.grupoBase.id
              const qtd = produtosPorGrupoId.get(grupoId)?.length ?? 0
              return (
                <div key={grupoId} role="listitem">
                  <CatalogProductRow
                    variant="menu"
                    id={grupoId}
                    nome={grupo.nome || grupo.grupoBase.nome}
                    valor={0}
                    ativo
                    imagemUrl={imagemUrlMenuGrupo(grupo)}
                    hidePauseAndPrice
                    hideCodigo
                    isSavingImage={
                      uploadImagemGrupo.isPending &&
                      uploadImagemGrupo.variables?.grupoProdutoId === grupoId
                    }
                    actionsSlot={
                      <span className="text-xs font-medium text-secondary-text">
                        {qtd === 1 ? '1 produto' : `${qtd} produtos`}
                      </span>
                    }
                    onEdit={handleEdit}
                    onRemove={handleAskRemove}
                    onChangeImage={handleChangeImage}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>

      <AddCategoriasToMenuPanel
        open={addOpen}
        menuId={menuId}
        categoriasJaNoMenu={categoriasJaNoMenu}
        produtosJaNoMenu={idsNoMenu}
        onClose={() => setAddOpen(false)}
        onCadastrarNova={() => tipoCadastro.pedirTipo(() => openWizardCadastro())}
      />

      <EscolherTipoProdutoModal
        open={tipoCadastro.open}
        onClose={tipoCadastro.fechar}
        onContinuar={tipoCadastro.continuar}
        cancelVariant={MENU_MODAL_CANCEL_VARIANT}
      />
      <MenuNovoProdutoWizard
        open={wizardOpen}
        menuId={menuId}
        menuNome={menu.nome}
        onClose={() => setWizardOpen(false)}
      />
      <MenuCategoriaSnapshotPanel
        open={Boolean(grupoEditando)}
        menuId={menuId}
        grupo={grupoEditando}
        onClose={() => setGrupoEditando(null)}
      />
      <MenuReorderCardapioModal
        open={reorderOpen}
        menuId={menuId}
        onClose={() => setReorderOpen(false)}
      />
      <JiffyFriendlyAlertDialog
        open={Boolean(removerGrupo)}
        onClose={() => {
          if (!removerBusy) setRemoverGrupo(null)
        }}
        onConfirm={() => void confirmRemove()}
        title="Remover esta categoria deste cardápio?"
        description="Os produtos desta categoria saem só deste cardápio. O cadastro em Cadastros não é apagado."
        confirmLabel="Ok, entendi!"
        iconVariant="warning"
        busy={removerBusy}
      />
      {cropModal}
    </MenuCardapioChrome>
  )
}
