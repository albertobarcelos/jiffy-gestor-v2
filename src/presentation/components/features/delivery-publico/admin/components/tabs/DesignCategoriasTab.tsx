'use client'

import { useCallback, useEffect, useState } from 'react'
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
import { IconPickerPanel } from '@/src/presentation/components/features/grupos-produtos/IconPickerPanel'
import { DeliveryImageUploadField } from '@/src/presentation/components/ui/DeliveryImageUploadField'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { showToast } from '@/src/shared/utils/toast'
import { cn } from '@/src/shared/utils/cn'
import type {
  CategoryIconStyle,
  DeliveryPublicoDesignConfig,
} from '../../../shared/types/deliveryPublicoDesignConfig'
import type { DesignCategoriaGrupo } from '../../../shared/types/designCategoriaGrupo'
import { resolveDesignPaletteColors } from '../../../shared/constants/colorPalettes'
import { DeliveryGrupoCategoriaVisual } from '../../../shared/components/DeliveryGrupoCategoriaVisual'
import { DesignCategoriaGrupoSortableItem } from '../DesignCategoriaGrupoSortableItem'
import { useDesignCategoriaGrupoActions } from '../../hooks/useDesignCategoriaGrupoActions'
import { useDesignCategoriaGruposImagens } from '../../../shared/hooks/useDesignCategoriaGruposImagens'

type DesignCategoriasTabProps = {
  config: DeliveryPublicoDesignConfig
  grupos: DesignCategoriaGrupo[]
  isLoading?: boolean
  isError?: boolean
  onChange: (updater: (current: DeliveryPublicoDesignConfig) => DeliveryPublicoDesignConfig) => void
  onGruposChange?: (grupos: DesignCategoriaGrupo[]) => void
}

export function DesignCategoriasTab({
  config,
  grupos,
  isLoading = false,
  isError = false,
  onChange,
  onGruposChange,
}: DesignCategoriasTabProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [localGrupos, setLocalGrupos] = useState(grupos)
  const [imagemPreviewUrl, setImagemPreviewUrl] = useState<string | null>(null)

  const {
    reordenarGrupo,
    uploadImagemGrupo,
    atualizarIconeGrupo,
    patchGrupoImagemUrl,
    patchGrupoIconName,
    uploadingGrupoId,
    reorderingGrupoId,
    updatingIconGrupoId,
  } = useDesignCategoriaGrupoActions()

  const palette = resolveDesignPaletteColors(config)
  const selectedCategory = localGrupos.find(c => c.id === selectedCategoryId)
  const usarImagensGrupo = config.categorias.usarImagensGrupo
  const isUploadingSelected = uploadingGrupoId === selectedCategoryId
  const isUpdatingIconSelected = updatingIconGrupoId === selectedCategoryId
  const isReordering = reorderingGrupoId != null

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const updateGrupos = useCallback(
    (next: DesignCategoriaGrupo[]) => {
      setLocalGrupos(next)
      onGruposChange?.(next)
    },
    [onGruposChange]
  )

  const handleImagensResolved = useCallback(
    (resolved: DesignCategoriaGrupo[]) => {
      updateGrupos(resolved)
    },
    [updateGrupos]
  )

  const { isResolvingImagens } = useDesignCategoriaGruposImagens({
    grupos: localGrupos,
    enabled: usarImagensGrupo && localGrupos.length > 0,
    onResolved: handleImagensResolved,
  })

  useEffect(() => {
    setLocalGrupos(grupos)
  }, [grupos])

  useEffect(() => {
    if (localGrupos.length === 0) {
      setSelectedCategoryId('')
      return
    }
    if (!localGrupos.some(g => g.id === selectedCategoryId)) {
      setSelectedCategoryId(localGrupos[0].id)
    }
  }, [localGrupos, selectedCategoryId])

  useEffect(() => {
    setImagemPreviewUrl(prev => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
      return selectedCategory?.imagemUrl ?? null
    })
  }, [selectedCategory?.id, selectedCategory?.imagemUrl])

  const selectedIconName = selectedCategory?.iconName || 'restaurant'

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id || isReordering) return

      const oldIndex = localGrupos.findIndex(g => g.id === active.id)
      const newIndex = localGrupos.findIndex(g => g.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return

      const previous = localGrupos
      const reordered = arrayMove(localGrupos, oldIndex, newIndex)
      updateGrupos(reordered)

      try {
        await reordenarGrupo(active.id as string, newIndex + 1)
        showToast.success('Ordem atualizada!')
      } catch (error) {
        updateGrupos(previous)
        showToast.error(error instanceof Error ? error.message : 'Erro ao reordenar grupo')
      }
    },
    [isReordering, localGrupos, reordenarGrupo, updateGrupos]
  )

  const handleImagemUpload = useCallback(
    async (file: File) => {
      if (!selectedCategoryId) return

      const preview = URL.createObjectURL(file)
      setImagemPreviewUrl(prev => {
        if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
        return preview
      })

      try {
        const imagemUrl = await uploadImagemGrupo(selectedCategoryId, file)
        const nextGrupos = patchGrupoImagemUrl(localGrupos, selectedCategoryId, imagemUrl)
        updateGrupos(nextGrupos)
        setImagemPreviewUrl(prev => {
          if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
          return imagemUrl ?? preview
        })
      } catch {
        setImagemPreviewUrl(prev => {
          if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
          return selectedCategory?.imagemUrl ?? null
        })
      }
    },
    [
      localGrupos,
      patchGrupoImagemUrl,
      selectedCategory?.imagemUrl,
      selectedCategoryId,
      updateGrupos,
      uploadImagemGrupo,
    ]
  )

  const handleClearImagemPreview = useCallback(() => {
    setImagemPreviewUrl(prev => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
      return selectedCategory?.imagemUrl ?? null
    })
  }, [selectedCategory?.imagemUrl])

  const handleIconSelect = useCallback(
    async (iconName: string) => {
      if (!selectedCategoryId) return

      const previous = localGrupos
      const nextGrupos = patchGrupoIconName(localGrupos, selectedCategoryId, iconName)
      updateGrupos(nextGrupos)

      try {
        await atualizarIconeGrupo(selectedCategoryId, iconName)
        onChange(current => {
          if (!(selectedCategoryId in current.categorias.iconesPorGrupoId)) {
            return current
          }
          const { [selectedCategoryId]: _removed, ...iconesPorGrupoId } =
            current.categorias.iconesPorGrupoId
          return {
            ...current,
            categorias: { ...current.categorias, iconesPorGrupoId },
          }
        })
        showToast.success('Ícone salvo no grupo!')
      } catch (error) {
        updateGrupos(previous)
        showToast.error(error instanceof Error ? error.message : 'Erro ao salvar ícone do grupo')
      }
    },
    [
      atualizarIconeGrupo,
      localGrupos,
      onChange,
      patchGrupoIconName,
      selectedCategoryId,
      updateGrupos,
    ]
  )

  if (isLoading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <JiffyLoading />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Não foi possível carregar os grupos de produtos. Tente recarregar a página.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-base font-semibold text-primary">Categorias</h3>
        <JiffyIconSwitch
          size="sm"
          label="Mostrar"
          labelPosition="start"
          checked={config.categorias.mostrar}
          onChange={e =>
            onChange(current => ({
              ...current,
              categorias: { ...current.categorias, mostrar: e.target.checked },
            }))
          }
        />
      </div>

      <JiffyIconSwitch
        size="sm"
        label="Usar imagens do grupo"
        labelPosition="start"
        checked={usarImagensGrupo}
        onChange={e =>
          onChange(current => ({
            ...current,
            categorias: { ...current.categorias, usarImagensGrupo: e.target.checked },
          }))
        }
      />

      {localGrupos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
          <p className="text-sm font-semibold text-primary-text">Nenhum grupo no delivery</p>
          <p className="mt-1 text-xs text-secondary-text">
            Cadastre grupos de produtos ativos no delivery em Grupos de produtos para personalizar
            as categorias aqui.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="w-full shrink-0 lg:max-w-[240px]">
            <p className="mb-1.5 text-xs text-secondary-text">
              {usarImagensGrupo && isResolvingImagens
                ? 'Carregando imagens dos grupos…'
                : 'Arraste para definir a ordem'}
            </p>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext
                items={localGrupos.map(g => g.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="space-y-1.5">
                  {localGrupos.map(cat => (
                    <DesignCategoriaGrupoSortableItem
                      key={cat.id}
                      grupo={cat}
                      config={config}
                      isSelected={cat.id === selectedCategoryId}
                      disabled={isReordering}
                      onSelect={setSelectedCategoryId}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          </div>

          <div className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white p-3">
            {usarImagensGrupo ? (
              <>
                <p className="text-sm font-semibold text-primary-text">
                  Imagem · {selectedCategory?.nome ?? '—'}
                </p>
                <div className="mt-3">
                  <DeliveryImageUploadField
                    disabled={!selectedCategory}
                    busy={isUploadingSelected}
                    previewUrl={imagemPreviewUrl}
                    helperText="A imagem é salva no grupo via cardápio delivery. Grupos sem imagem exibem o ícone padrão."
                    emptyHint="Arraste uma imagem ou clique para selecionar"
                    onFileSelected={handleImagemUpload}
                    onClearPreview={
                      imagemPreviewUrl?.startsWith('blob:') &&
                      imagemPreviewUrl !== selectedCategory?.imagemUrl
                        ? handleClearImagemPreview
                        : undefined
                    }
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm font-semibold text-primary-text">
                    Ícone · {selectedCategory?.nome ?? '—'}
                  </p>
                  {selectedCategory ? (
                    <DeliveryGrupoCategoriaVisual
                      config={config}
                      grupo={selectedCategory}
                      size="md"
                    />
                  ) : null}
                </div>

                <div className="mt-2 flex gap-2">
                  {(['linha', 'preenchimento'] as CategoryIconStyle[]).map(estilo => (
                    <button
                      key={estilo}
                      type="button"
                      onClick={() =>
                        onChange(current => ({
                          ...current,
                          categorias: { ...current.categorias, estiloIcone: estilo },
                        }))
                      }
                      className={cn(
                        'rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors',
                        config.categorias.estiloIcone === estilo
                          ? 'bg-secondary text-white'
                          : 'bg-gray-100 text-secondary-text hover:bg-gray-200'
                      )}
                    >
                      {estilo === 'linha' ? 'Linha' : 'Preenchimento'}
                    </button>
                  ))}
                </div>

                {isUpdatingIconSelected ? (
                  <p className="text-xs text-secondary-text">Salvando ícone no grupo…</p>
                ) : null}

                <IconPickerPanel
                  enabled={Boolean(selectedCategory)}
                  selectedColor={palette.primary}
                  selectedIconName={selectedIconName}
                  disabled={!selectedCategory || isUpdatingIconSelected}
                  variant="inline"
                  onSelect={handleIconSelect}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
