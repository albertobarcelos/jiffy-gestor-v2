'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { arrayMove } from '@dnd-kit/sortable'
import type { DragEndEvent } from '@dnd-kit/core'
import { aplicarReordenacaoMenuUseCase } from '@/src/application/use-cases/menus/AplicarReordenacaoMenuUseCase'
import { buscarMenuProdutoViaBffUseCase } from '@/src/application/use-cases/menus/menuBffUseCases'
import { ordenarComplementosResumoCatalogo } from '@/src/application/mappers/MenuProdutoCatalogMapper'
import {
  reordenarComplementoNoMenu,
  reordenarGrupoComplementoNoMenu,
} from '@/src/presentation/components/features/complementos/complementoOverrideApi'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { hasReorderChanged } from '@/src/shared/utils/computeReorderPatches'
import { showToast } from '@/src/shared/utils/toast'
import type {
  MenuGrupoProduto,
  MenuProduto,
  MenuProdutoComplementoItemResumo,
  MenuProdutoComplementoResumo,
} from '@/src/shared/types/menus'
import {
  categoriaLabel,
  fetchAllMenuGrupos,
  fetchAllMenuProdutosByGrupo,
  grupoBaseId,
  produtoLabel,
} from './menuReorderCatalogLoad'

export type MenuReorderComplementoItem = MenuProdutoComplementoItemResumo

type ProdutosPorGrupoState = Record<string, MenuProduto[]>

function aplicarOrdemComplementos(
  lista: MenuProdutoComplementoItemResumo[]
): MenuProdutoComplementoItemResumo[] {
  return lista.map((item, index) => ({ ...item, ordem: index + 1 }))
}

export function useMenuReorderCardapioState(menuId: string, open: boolean) {
  const invalidate = useInvalidateTenantQueries()
  const [loadingCatalog, setLoadingCatalog] = useState(false)
  const [loadingProdutos, setLoadingProdutos] = useState(false)
  const [loadingGruposComplemento, setLoadingGruposComplemento] = useState(false)
  const [saving, setSaving] = useState(false)
  const [reordenandoChave, setReordenandoChave] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [categorias, setCategorias] = useState<MenuGrupoProduto[]>([])
  const initialCategoriaIdsRef = useRef<string[]>([])

  const [produtosPorGrupo, setProdutosPorGrupo] = useState<ProdutosPorGrupoState>({})
  const initialProdutoIdsRef = useRef<Record<string, string[]>>({})
  const hydratedProdutoIdsRef = useRef<Set<string>>(new Set())

  const [selectedGrupoId, setSelectedGrupoId] = useState<string | null>(null)
  const [selectedProdutoId, setSelectedProdutoId] = useState<string | null>(null)
  const [selectedGrupoComplementoId, setSelectedGrupoComplementoId] = useState<string | null>(
    null
  )

  const resetState = useCallback(() => {
    setCategorias([])
    initialCategoriaIdsRef.current = []
    setProdutosPorGrupo({})
    initialProdutoIdsRef.current = {}
    hydratedProdutoIdsRef.current = new Set()
    setSelectedGrupoId(null)
    setSelectedProdutoId(null)
    setSelectedGrupoComplementoId(null)
    setLoadError(null)
    setReordenandoChave(null)
  }, [])

  const loadCatalog = useCallback(async () => {
    const token = useAuthStore.getState().tenantAuth?.getAccessToken()
    if (!token || !menuId) return

    setLoadingCatalog(true)
    setLoadError(null)
    try {
      const grupos = await fetchAllMenuGrupos(token, menuId)
      setCategorias(grupos)
      initialCategoriaIdsRef.current = grupos.map(grupoBaseId)
      setProdutosPorGrupo({})
      initialProdutoIdsRef.current = {}
      hydratedProdutoIdsRef.current = new Set()
      setSelectedGrupoId(grupos[0] ? grupoBaseId(grupos[0]) : null)
      setSelectedProdutoId(null)
      setSelectedGrupoComplementoId(null)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Erro ao carregar cardápio')
    } finally {
      setLoadingCatalog(false)
    }
  }, [menuId])

  useEffect(() => {
    if (!open) {
      resetState()
      return
    }
    void loadCatalog()
  }, [open, loadCatalog, resetState])

  const loadProdutosForGrupo = useCallback(
    async (grupoId: string) => {
      if (produtosPorGrupo[grupoId]) return

      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
      if (!token || !menuId) return

      setLoadingProdutos(true)
      try {
        const produtos = await fetchAllMenuProdutosByGrupo(token, menuId, grupoId)
        setProdutosPorGrupo(prev => ({ ...prev, [grupoId]: produtos }))
        if (!initialProdutoIdsRef.current[grupoId]) {
          initialProdutoIdsRef.current = {
            ...initialProdutoIdsRef.current,
            [grupoId]: produtos.map(p => p.produtoId),
          }
        }
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Erro ao carregar produtos')
      } finally {
        setLoadingProdutos(false)
      }
    },
    [menuId, produtosPorGrupo]
  )

  useEffect(() => {
    if (!open || !selectedGrupoId) return
    void loadProdutosForGrupo(selectedGrupoId)
  }, [open, selectedGrupoId, loadProdutosForGrupo])

  const produtosAtivos = useMemo(
    () => (selectedGrupoId ? produtosPorGrupo[selectedGrupoId] ?? [] : []),
    [selectedGrupoId, produtosPorGrupo]
  )

  const selectedProduto = useMemo(
    () => produtosAtivos.find(p => p.produtoId === selectedProdutoId) ?? null,
    [produtosAtivos, selectedProdutoId]
  )

  const hydrateProdutoComplementos = useCallback(
    async (produtoId: string) => {
      if (!menuId || hydratedProdutoIdsRef.current.has(produtoId)) return

      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
      if (!token) return

      setLoadingGruposComplemento(true)
      try {
        const detalhe = await buscarMenuProdutoViaBffUseCase.execute({
          token,
          menuId,
          produtoId,
        })
        hydratedProdutoIdsRef.current.add(produtoId)
        setProdutosPorGrupo(prev => {
          const next: ProdutosPorGrupoState = {}
          for (const [grupoId, list] of Object.entries(prev)) {
            next[grupoId] = list.map(produto =>
              produto.produtoId === produtoId
                ? {
                    ...produto,
                    gruposComplementos: Array.isArray(detalhe.gruposComplementos)
                      ? detalhe.gruposComplementos
                      : produto.gruposComplementos,
                  }
                : produto
            )
          }
          return next
        })
      } catch (err) {
        showToast.error(
          err instanceof Error ? err.message : 'Erro ao carregar grupos de complementos'
        )
      } finally {
        setLoadingGruposComplemento(false)
      }
    },
    [menuId]
  )

  useEffect(() => {
    if (!open || !selectedProdutoId) return
    void hydrateProdutoComplementos(selectedProdutoId)
  }, [open, selectedProdutoId, hydrateProdutoComplementos])

  const gruposComplemento = useMemo(
    () => selectedProduto?.gruposComplementos ?? [],
    [selectedProduto]
  )

  useEffect(() => {
    if (!selectedProduto) {
      setSelectedGrupoComplementoId(null)
      return
    }
    if (
      gruposComplemento.length > 0 &&
      !gruposComplemento.some(g => g.id === selectedGrupoComplementoId)
    ) {
      setSelectedGrupoComplementoId(gruposComplemento[0]?.id ?? null)
    }
  }, [selectedProduto, gruposComplemento, selectedGrupoComplementoId])

  const complementosDoGrupo = useMemo(() => {
    const grupo = gruposComplemento.find(g => g.id === selectedGrupoComplementoId)
    return ordenarComplementosResumoCatalogo(grupo?.complementos ?? [])
  }, [gruposComplemento, selectedGrupoComplementoId])

  const categoriasDirty = useMemo(
    () =>
      hasReorderChanged(
        initialCategoriaIdsRef.current,
        categorias.map(grupoBaseId)
      ),
    [categorias]
  )

  const produtosDirty = useMemo(() => {
    for (const grupoId of Object.keys(produtosPorGrupo)) {
      const initial = initialProdutoIdsRef.current[grupoId] ?? []
      const final = (produtosPorGrupo[grupoId] ?? []).map(p => p.produtoId)
      if (hasReorderChanged(initial, final)) return true
    }
    return false
  }, [produtosPorGrupo])

  const isDirty = categoriasDirty || produtosDirty
  const dragBloqueado = saving || reordenandoChave !== null

  const atualizarGruposComplementoDoProduto = useCallback(
    (produtoId: string, grupos: MenuProdutoComplementoResumo[]) => {
      setProdutosPorGrupo(prev => {
        const next: ProdutosPorGrupoState = {}
        for (const [grupoId, list] of Object.entries(prev)) {
          next[grupoId] = list.map(produto =>
            produto.produtoId === produtoId
              ? { ...produto, gruposComplementos: grupos }
              : produto
          )
        }
        return next
      })
    },
    []
  )

  const handleSelectGrupo = useCallback((grupoId: string) => {
    setSelectedGrupoId(grupoId)
    setSelectedProdutoId(null)
    setSelectedGrupoComplementoId(null)
  }, [])

  const handleSelectProduto = useCallback((produtoId: string) => {
    setSelectedProdutoId(produtoId)
    setSelectedGrupoComplementoId(null)
  }, [])

  const handleSelectGrupoComplemento = useCallback((grupoComplementoId: string) => {
    setSelectedGrupoComplementoId(grupoComplementoId)
  }, [])

  const handleDragEndCategorias = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setCategorias(prev => {
      const oldIndex = prev.findIndex(g => grupoBaseId(g) === active.id)
      const newIndex = prev.findIndex(g => grupoBaseId(g) === over.id)
      if (oldIndex === -1 || newIndex === -1) return prev
      return arrayMove(prev, oldIndex, newIndex)
    })
  }, [])

  const handleDragEndProdutos = useCallback(
    (event: DragEndEvent) => {
      if (!selectedGrupoId) return
      const { active, over } = event
      if (!over || active.id === over.id) return

      setProdutosPorGrupo(prev => {
        const list = prev[selectedGrupoId] ?? []
        const oldIndex = list.findIndex(p => p.produtoId === active.id)
        const newIndex = list.findIndex(p => p.produtoId === over.id)
        if (oldIndex === -1 || newIndex === -1) return prev
        return {
          ...prev,
          [selectedGrupoId]: arrayMove(list, oldIndex, newIndex),
        }
      })
    },
    [selectedGrupoId]
  )

  const handleDragEndGruposComplemento = useCallback(
    async (event: DragEndEvent) => {
      const produtoId = selectedProdutoId?.trim()
      if (!produtoId || !menuId || dragBloqueado) return

      const { active, over } = event
      if (!over || active.id === over.id) return

      const anterior = gruposComplemento
      const oldIndex = anterior.findIndex(g => g.id === active.id)
      const newIndex = anterior.findIndex(g => g.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return

      const reordenados = arrayMove(anterior, oldIndex, newIndex)
      atualizarGruposComplementoDoProduto(produtoId, reordenados)

      const chave = `grupo:${String(active.id)}`
      setReordenandoChave(chave)
      try {
        await reordenarGrupoComplementoNoMenu({
          menuId,
          produtoId,
          grupoComplementoId: String(active.id),
          novaPosicao: newIndex + 1,
        })
        await invalidate(['menu-produtos', menuId])
      } catch (err) {
        atualizarGruposComplementoDoProduto(produtoId, anterior)
        showToast.error(err instanceof Error ? err.message : 'Erro ao reordenar grupo')
      } finally {
        setReordenandoChave(null)
      }
    },
    [
      atualizarGruposComplementoDoProduto,
      dragBloqueado,
      gruposComplemento,
      invalidate,
      menuId,
      selectedProdutoId,
    ]
  )

  const handleDragEndComplementos = useCallback(
    async (event: DragEndEvent) => {
      const produtoId = selectedProdutoId?.trim()
      const grupoComplementoId = selectedGrupoComplementoId?.trim()
      if (!produtoId || !grupoComplementoId || !menuId || dragBloqueado) return

      const { active, over } = event
      if (!over || active.id === over.id) return

      const anterior = complementosDoGrupo
      const oldIndex = anterior.findIndex(c => c.id === active.id)
      const newIndex = anterior.findIndex(c => c.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return

      const reordenados = aplicarOrdemComplementos(arrayMove(anterior, oldIndex, newIndex))
      const gruposAtualizados = gruposComplemento.map(grupo =>
        grupo.id === grupoComplementoId ? { ...grupo, complementos: reordenados } : grupo
      )
      atualizarGruposComplementoDoProduto(produtoId, gruposAtualizados)

      const chave = `comp:${String(active.id)}`
      setReordenandoChave(chave)
      try {
        await reordenarComplementoNoMenu({
          menuId,
          produtoId,
          grupoComplementoId,
          complementoId: String(active.id),
          novaPosicao: newIndex + 1,
        })
        await invalidate(['menu-produtos', menuId])
      } catch (err) {
        const gruposRollback = gruposComplemento.map(grupo =>
          grupo.id === grupoComplementoId ? { ...grupo, complementos: anterior } : grupo
        )
        atualizarGruposComplementoDoProduto(produtoId, gruposRollback)
        showToast.error(err instanceof Error ? err.message : 'Erro ao reordenar complemento')
      } finally {
        setReordenandoChave(null)
      }
    },
    [
      atualizarGruposComplementoDoProduto,
      complementosDoGrupo,
      dragBloqueado,
      gruposComplemento,
      invalidate,
      menuId,
      selectedGrupoComplementoId,
      selectedProdutoId,
    ]
  )

  const cancelChanges = useCallback(() => {
    setCategorias(prev => {
      const map = new Map(prev.map(g => [grupoBaseId(g), g]))
      return initialCategoriaIdsRef.current
        .map(id => map.get(id))
        .filter((g): g is MenuGrupoProduto => Boolean(g))
    })

    setProdutosPorGrupo(prev => {
      const next: ProdutosPorGrupoState = {}
      for (const [grupoId, list] of Object.entries(prev)) {
        const initialIds = initialProdutoIdsRef.current[grupoId]
        if (!initialIds) {
          next[grupoId] = list
          continue
        }
        const map = new Map(list.map(p => [p.produtoId, p]))
        next[grupoId] = initialIds
          .map(id => map.get(id))
          .filter((p): p is MenuProduto => Boolean(p))
      }
      return next
    })
  }, [])

  const save = useCallback(async (): Promise<boolean> => {
    if (!isDirty) return true

    const token = useAuthStore.getState().tenantAuth?.getAccessToken()
    if (!token) throw new Error('Token não encontrado')

    setSaving(true)
    try {
      const produtosPorGrupoInput = Object.entries(produtosPorGrupo)
        .map(([grupoProdutoId, list]) => {
          const initial = initialProdutoIdsRef.current[grupoProdutoId] ?? []
          const final = list.map(p => p.produtoId)
          if (!hasReorderChanged(initial, final)) return null
          return { grupoProdutoId, initialProdutoIds: initial, finalProdutoIds: final }
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)

      await aplicarReordenacaoMenuUseCase.execute({
        token,
        menuId,
        categorias: categoriasDirty
          ? {
              initialGrupoBaseIds: initialCategoriaIdsRef.current,
              finalGrupoBaseIds: categorias.map(grupoBaseId),
            }
          : undefined,
        produtosPorGrupo: produtosPorGrupoInput,
      })

      initialCategoriaIdsRef.current = categorias.map(grupoBaseId)
      initialProdutoIdsRef.current = Object.fromEntries(
        Object.entries(produtosPorGrupo).map(([grupoId, list]) => [
          grupoId,
          list.map(p => p.produtoId),
        ])
      )

      await invalidate(['menu-grupos', menuId])
      await invalidate(['menu-produtos', menuId])
      return true
    } finally {
      setSaving(false)
    }
  }, [categorias, categoriasDirty, invalidate, isDirty, menuId, produtosPorGrupo])

  return {
    loadingCatalog,
    loadingProdutos,
    loadingGruposComplemento,
    loadingComplementos: loadingGruposComplemento,
    saving,
    reordenandoChave,
    dragBloqueado,
    loadError,
    categorias,
    produtosAtivos,
    gruposComplemento,
    complementosDoGrupo,
    selectedGrupoId,
    selectedProdutoId,
    selectedGrupoComplementoId,
    isDirty,
    categoriaLabel,
    produtoLabel,
    grupoBaseId,
    handleSelectGrupo,
    handleSelectProduto,
    handleSelectGrupoComplemento,
    handleDragEndCategorias,
    handleDragEndProdutos,
    handleDragEndGruposComplemento,
    handleDragEndComplementos,
    cancelChanges,
    save,
  }
}
