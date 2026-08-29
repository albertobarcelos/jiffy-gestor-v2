'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { arrayMove } from '@dnd-kit/sortable'
import type { DragEndEvent } from '@dnd-kit/core'
import { aplicarReordenacaoPizzaUseCase } from '@/src/application/use-cases/pizza/AplicarReordenacaoPizzaUseCase'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { hasReorderChanged } from '@/src/shared/utils/computeReorderPatches'
import type { CategoriaPizza, SaborPizzaSummary } from '@/src/shared/types/pizza'
import {
  categoriaPizzaLabel,
  fetchAllPizzaCategorias,
  fetchAllPizzaSaboresByCategoria,
  saborPizzaLabel,
} from './pizzaReorderCatalogLoad'

type SaboresPorCategoriaState = Record<string, SaborPizzaSummary[]>

export function usePizzaReorderState(open: boolean) {
  const invalidate = useInvalidateTenantQueries()
  const [loadingCatalog, setLoadingCatalog] = useState(false)
  const [loadingSabores, setLoadingSabores] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [categorias, setCategorias] = useState<CategoriaPizza[]>([])
  const initialCategoriaIdsRef = useRef<string[]>([])

  const [saboresPorCategoria, setSaboresPorCategoria] = useState<SaboresPorCategoriaState>({})
  const initialSaborIdsRef = useRef<Record<string, string[]>>({})

  const [selectedCategoriaId, setSelectedCategoriaId] = useState<string | null>(null)

  const resetState = useCallback(() => {
    setCategorias([])
    initialCategoriaIdsRef.current = []
    setSaboresPorCategoria({})
    initialSaborIdsRef.current = {}
    setSelectedCategoriaId(null)
    setLoadError(null)
  }, [])

  const loadCatalog = useCallback(async () => {
    const token = useAuthStore.getState().tenantAuth?.getAccessToken()
    if (!token) return

    setLoadingCatalog(true)
    setLoadError(null)
    try {
      const list = await fetchAllPizzaCategorias(token)
      setCategorias(list)
      initialCategoriaIdsRef.current = list.map(c => c.id)
      setSaboresPorCategoria({})
      initialSaborIdsRef.current = {}
      setSelectedCategoriaId(list[0]?.id ?? null)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Erro ao carregar categorias pizza')
    } finally {
      setLoadingCatalog(false)
    }
  }, [])

  useEffect(() => {
    if (!open) {
      resetState()
      return
    }
    void loadCatalog()
  }, [open, loadCatalog, resetState])

  const loadSaboresForCategoria = useCallback(
    async (categoriaId: string) => {
      if (saboresPorCategoria[categoriaId]) return

      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
      if (!token) return

      setLoadingSabores(true)
      try {
        const sabores = await fetchAllPizzaSaboresByCategoria(token, categoriaId)
        setSaboresPorCategoria(prev => ({ ...prev, [categoriaId]: sabores }))
        if (!initialSaborIdsRef.current[categoriaId]) {
          initialSaborIdsRef.current = {
            ...initialSaborIdsRef.current,
            [categoriaId]: sabores.map(s => s.id),
          }
        }
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Erro ao carregar sabores')
      } finally {
        setLoadingSabores(false)
      }
    },
    [saboresPorCategoria]
  )

  useEffect(() => {
    if (!open || !selectedCategoriaId) return
    void loadSaboresForCategoria(selectedCategoriaId)
  }, [open, selectedCategoriaId, loadSaboresForCategoria])

  const saboresAtivos = useMemo(
    () => (selectedCategoriaId ? saboresPorCategoria[selectedCategoriaId] ?? [] : []),
    [selectedCategoriaId, saboresPorCategoria]
  )

  const categoriasDirty = useMemo(
    () =>
      hasReorderChanged(
        initialCategoriaIdsRef.current,
        categorias.map(c => c.id)
      ),
    [categorias]
  )

  const saboresDirty = useMemo(() => {
    for (const categoriaId of Object.keys(saboresPorCategoria)) {
      const initial = initialSaborIdsRef.current[categoriaId] ?? []
      const final = (saboresPorCategoria[categoriaId] ?? []).map(s => s.id)
      if (hasReorderChanged(initial, final)) return true
    }
    return false
  }, [saboresPorCategoria])

  const isDirty = categoriasDirty || saboresDirty

  const handleSelectCategoria = useCallback((categoriaId: string) => {
    setSelectedCategoriaId(categoriaId)
  }, [])

  const handleDragEndCategorias = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setCategorias(prev => {
      const oldIndex = prev.findIndex(c => c.id === active.id)
      const newIndex = prev.findIndex(c => c.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return prev
      return arrayMove(prev, oldIndex, newIndex)
    })
  }, [])

  const handleDragEndSabores = useCallback(
    (event: DragEndEvent) => {
      if (!selectedCategoriaId) return
      const { active, over } = event
      if (!over || active.id === over.id) return

      setSaboresPorCategoria(prev => {
        const list = prev[selectedCategoriaId] ?? []
        const oldIndex = list.findIndex(s => s.id === active.id)
        const newIndex = list.findIndex(s => s.id === over.id)
        if (oldIndex === -1 || newIndex === -1) return prev
        return {
          ...prev,
          [selectedCategoriaId]: arrayMove(list, oldIndex, newIndex),
        }
      })
    },
    [selectedCategoriaId]
  )

  const cancelChanges = useCallback(() => {
    setCategorias(prev => {
      const map = new Map(prev.map(c => [c.id, c]))
      return initialCategoriaIdsRef.current
        .map(id => map.get(id))
        .filter((c): c is CategoriaPizza => Boolean(c))
    })

    setSaboresPorCategoria(prev => {
      const next: SaboresPorCategoriaState = {}
      for (const [categoriaId, list] of Object.entries(prev)) {
        const initialIds = initialSaborIdsRef.current[categoriaId]
        if (!initialIds) {
          next[categoriaId] = list
          continue
        }
        const map = new Map(list.map(s => [s.id, s]))
        next[categoriaId] = initialIds
          .map(id => map.get(id))
          .filter((s): s is SaborPizzaSummary => Boolean(s))
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
      const saboresPorCategoriaInput = Object.entries(saboresPorCategoria)
        .map(([categoriaPizzaId, list]) => {
          const initial = initialSaborIdsRef.current[categoriaPizzaId] ?? []
          const final = list.map(s => s.id)
          if (!hasReorderChanged(initial, final)) return null
          return { categoriaPizzaId, initialSaborIds: initial, finalSaborIds: final }
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)

      await aplicarReordenacaoPizzaUseCase.execute({
        token,
        categorias: categoriasDirty
          ? {
              initialCategoriaIds: initialCategoriaIdsRef.current,
              finalCategoriaIds: categorias.map(c => c.id),
            }
          : undefined,
        saboresPorCategoria: saboresPorCategoriaInput,
      })

      initialCategoriaIdsRef.current = categorias.map(c => c.id)
      initialSaborIdsRef.current = Object.fromEntries(
        Object.entries(saboresPorCategoria).map(([categoriaId, list]) => [
          categoriaId,
          list.map(s => s.id),
        ])
      )

      await invalidate(['pizza'])
      return true
    } finally {
      setSaving(false)
    }
  }, [categorias, categoriasDirty, invalidate, isDirty, saboresPorCategoria])

  return {
    loadingCatalog,
    loadingSabores,
    saving,
    loadError,
    categorias,
    saboresAtivos,
    selectedCategoriaId,
    isDirty,
    categoriaPizzaLabel,
    saborPizzaLabel,
    handleSelectCategoria,
    handleDragEndCategorias,
    handleDragEndSabores,
    cancelChanges,
    save,
  }
}
