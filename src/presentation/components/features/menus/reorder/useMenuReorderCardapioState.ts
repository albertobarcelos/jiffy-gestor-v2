'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { arrayMove } from '@dnd-kit/sortable'
import type { DragEndEvent } from '@dnd-kit/core'
import { aplicarReordenacaoMenuUseCase } from '@/src/application/use-cases/menus/AplicarReordenacaoMenuUseCase'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { hasReorderChanged } from '@/src/shared/utils/computeReorderPatches'
import type { MenuGrupoProduto, MenuProduto } from '@/src/shared/types/menus'
import {
  categoriaLabel,
  fetchAllMenuGrupos,
  fetchAllMenuProdutosByGrupo,
  grupoBaseId,
  produtoLabel,
} from './menuReorderCatalogLoad'

export type MenuReorderComplementoItem = {
  id: string
  nome: string
}

type ProdutosPorGrupoState = Record<string, MenuProduto[]>

function sortComplementos(list: MenuReorderComplementoItem[]): MenuReorderComplementoItem[] {
  return [...list].sort((a, b) =>
    a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
  )
}

function mapComplementosFromGrupoApi(data: unknown): MenuReorderComplementoItem[] {
  const root = data as { complementos?: unknown; data?: { complementos?: unknown } }
  const raw = Array.isArray(root.complementos)
    ? root.complementos
    : Array.isArray(root.data?.complementos)
      ? root.data.complementos
      : []

  return sortComplementos(
    raw
      .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
      .map(item => ({
        id: String(item.id ?? ''),
        nome: String(item.nome ?? 'Complemento').trim() || 'Complemento',
      }))
      .filter(item => item.id)
  )
}

export function useMenuReorderCardapioState(menuId: string, open: boolean) {
  const invalidate = useInvalidateTenantQueries()
  const [loadingCatalog, setLoadingCatalog] = useState(false)
  const [loadingProdutos, setLoadingProdutos] = useState(false)
  const [loadingComplementos, setLoadingComplementos] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [categorias, setCategorias] = useState<MenuGrupoProduto[]>([])
  const initialCategoriaIdsRef = useRef<string[]>([])

  const [produtosPorGrupo, setProdutosPorGrupo] = useState<ProdutosPorGrupoState>({})
  const initialProdutoIdsRef = useRef<Record<string, string[]>>({})

  const [selectedGrupoId, setSelectedGrupoId] = useState<string | null>(null)
  const [selectedProdutoId, setSelectedProdutoId] = useState<string | null>(null)
  const [selectedGrupoComplementoId, setSelectedGrupoComplementoId] = useState<string | null>(
    null
  )
  const [complementosDoGrupo, setComplementosDoGrupo] = useState<MenuReorderComplementoItem[]>([])

  const resetState = useCallback(() => {
    setCategorias([])
    initialCategoriaIdsRef.current = []
    setProdutosPorGrupo({})
    initialProdutoIdsRef.current = {}
    setSelectedGrupoId(null)
    setSelectedProdutoId(null)
    setSelectedGrupoComplementoId(null)
    setComplementosDoGrupo([])
    setLoadError(null)
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
      setSelectedGrupoId(grupos[0] ? grupoBaseId(grupos[0]) : null)
      setSelectedProdutoId(null)
      setSelectedGrupoComplementoId(null)
      setComplementosDoGrupo([])
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

  useEffect(() => {
    if (!open || !selectedGrupoComplementoId) {
      setComplementosDoGrupo([])
      return
    }

    const token = useAuthStore.getState().tenantAuth?.getAccessToken()
    if (!token) return

    let cancelled = false
    setLoadingComplementos(true)
    void (async () => {
      try {
        const response = await fetchGestorApi(
          `/api/grupos-complementos/${encodeURIComponent(selectedGrupoComplementoId)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            cache: 'no-store',
          }
        )
        if (!response.ok) {
          throw new Error('Erro ao carregar complementos')
        }
        const data = await response.json()
        if (!cancelled) {
          setComplementosDoGrupo(mapComplementosFromGrupoApi(data))
        }
      } catch {
        if (!cancelled) setComplementosDoGrupo([])
      } finally {
        if (!cancelled) setLoadingComplementos(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, selectedGrupoComplementoId])

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

  const handleSelectGrupo = useCallback((grupoId: string) => {
    setSelectedGrupoId(grupoId)
    setSelectedProdutoId(null)
    setSelectedGrupoComplementoId(null)
    setComplementosDoGrupo([])
  }, [])

  const handleSelectProduto = useCallback((produtoId: string) => {
    setSelectedProdutoId(produtoId)
    setSelectedGrupoComplementoId(null)
    setComplementosDoGrupo([])
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
    loadingComplementos,
    saving,
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
    cancelChanges,
    save,
  }
}
