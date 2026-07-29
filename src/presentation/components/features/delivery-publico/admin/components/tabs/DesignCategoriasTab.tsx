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
import { DeliveryImageUploadField } from '@/src/presentation/components/ui/DeliveryImageUploadField'
import { DELIVERY_GRUPO_BANNER_CROP_PRESET } from '@/src/presentation/constants/imageCropPresets'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { showToast } from '@/src/shared/utils/toast'
import type { DeliveryPublicoDesignConfig } from '../../../shared/types/deliveryPublicoDesignConfig'
import type { DesignCategoriaGrupo } from '../../../shared/types/designCategoriaGrupo'
import { resolveDesignPaletteColors } from '../../../shared/constants/colorPalettes'
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
    patchGrupoImagemUrl,
    uploadingGrupoId,
    reorderingGrupoId,
  } = useDesignCategoriaGrupoActions()

  const palette = resolveDesignPaletteColors(config)
  const selectedCategory = localGrupos.find(c => c.id === selectedCategoryId)
  const usarBannerImagem = config.categorias.tituloGrupoFundo === 'imagem'
  const corTemaBarra = palette.primaryDark.toUpperCase()
  const corTemaTexto = '#FFFFFF'
  const corBarraEfetiva = (config.categorias.corBarraTitulo ?? corTemaBarra).toUpperCase()
  const corTextoEfetiva = (config.categorias.corTextoTitulo ?? corTemaTexto).toUpperCase()
  const usaTemaBarra = config.categorias.corBarraTitulo == null
  const usaTemaTexto = config.categorias.corTextoTitulo == null
  const isUploadingSelected = uploadingGrupoId === selectedCategoryId
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
    enabled: usarBannerImagem && localGrupos.length > 0,
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
    <div className="space-y-2">
      <h3 className="text-base font-semibold text-primary">Categorias</h3>

      <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <label
              className="relative mt-0.5 flex h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-gray-200"
              title={`Cor da barra: ${corBarraEfetiva}`}
            >
              <span className="absolute inset-0" style={{ backgroundColor: corBarraEfetiva }} />
              <input
                type="color"
                value={corBarraEfetiva}
                aria-label="Escolher cor da barra do título"
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                onChange={e => {
                  const next = e.target.value.toUpperCase()
                  onChange(current => ({
                    ...current,
                    categorias: {
                      ...current.categorias,
                      // Mesma cor do tema → permanece no modo tema (null).
                      corBarraTitulo: next === corTemaBarra ? null : next,
                    },
                  }))
                }}
              />
            </label>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-primary-text">Cor da barra do título</p>
              <p className="mt-0.5 text-xs text-secondary-text">
                Fundo para todos os grupos. Sem personalização, usa a cor escura do tema.
              </p>
            </div>
          </div>
          <JiffyIconSwitch
            size="xs"
            label={usaTemaBarra ? 'Tema' : 'Usar Tema'}
            labelPosition="start"
            checked={usaTemaBarra}
            disabled={usaTemaBarra}
            onChange={e => {
              if (!e.target.checked) return
              onChange(current => ({
                ...current,
                categorias: { ...current.categorias, corBarraTitulo: null },
              }))
            }}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-1">
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <label
              className="relative mt-0.5 flex h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-gray-200"
              title={`Cor do texto: ${corTextoEfetiva}`}
            >
              <span className="absolute inset-0" style={{ backgroundColor: corTextoEfetiva }} />
              <input
                type="color"
                value={corTextoEfetiva}
                aria-label="Escolher cor do nome do grupo"
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                onChange={e => {
                  const next = e.target.value.toUpperCase()
                  onChange(current => ({
                    ...current,
                    categorias: {
                      ...current.categorias,
                      corTextoTitulo: next === corTemaTexto ? null : next,
                    },
                  }))
                }}
              />
            </label>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-primary-text">Cor do nome do grupo</p>
              <p className="mt-0.5 text-xs text-secondary-text">
                Texto na barra para todos os grupos. Sem personalização, usa a cor do tema.
              </p>
            </div>
          </div>
          <JiffyIconSwitch
            size="xs"
            label={usaTemaTexto ? 'Tema' : 'Usar Tema'}
            labelPosition="start"
            checked={usaTemaTexto}
            disabled={usaTemaTexto}
            onChange={e => {
              if (!e.target.checked) return
              onChange(current => ({
                ...current,
                categorias: { ...current.categorias, corTextoTitulo: null },
              }))
            }}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-1">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-primary-text">
              Usar imagem como fundo do título
            </p>
            <p className="mt-0.5 text-xs text-secondary-text">
              Com a opção ligada, o banner do grupo aparece na barra. Sem imagem, mantém a cor
              sólida.
            </p>
          </div>
          <JiffyIconSwitch
            size="xs"
            label={usarBannerImagem ? 'ON' : 'OFF'}
            labelPosition="start"
            checked={usarBannerImagem}
            onChange={e =>
              onChange(current => ({
                ...current,
                categorias: {
                  ...current.categorias,
                  tituloGrupoFundo: e.target.checked ? 'imagem' : 'cor',
                },
              }))
            }
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-1">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-primary-text">Exibir nome do grupo</p>
            <p className="mt-0.5 text-xs text-secondary-text">
              Mostra o nome na barra. Desligue se o banner já trouxer o nome personalizado.
            </p>
          </div>
          <JiffyIconSwitch
            size="xs"
            label={config.categorias.mostrarNomeTitulo ? 'ON' : 'OFF'}
            labelPosition="start"
            checked={config.categorias.mostrarNomeTitulo}
            onChange={e =>
              onChange(current => ({
                ...current,
                categorias: {
                  ...current.categorias,
                  mostrarNomeTitulo: e.target.checked,
                },
              }))
            }
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-1">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-primary-text">Grupo Sugestões da Casa</p>
            <p className="mt-0.5 text-xs text-secondary-text">
              Grupo fixo no início do cardápio com produtos marcados como favoritos.
            </p>
          </div>
          <JiffyIconSwitch
            size="xs"
            label={config.categorias.mostrarSugestoesDaCasa ? 'ON' : 'OFF'}
            labelPosition="start"
            checked={config.categorias.mostrarSugestoesDaCasa}
            onChange={e =>
              onChange(current => ({
                ...current,
                categorias: {
                  ...current.categorias,
                  mostrarSugestoesDaCasa: e.target.checked,
                },
              }))
            }
          />
        </div>
      </div>

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
              {usarBannerImagem && isResolvingImagens
                ? 'Carregando banners dos grupos…'
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
            {usarBannerImagem ? (
              <>
                <p className="text-sm font-semibold text-primary-text">
                  Banner · {selectedCategory?.nome ?? '—'}
                </p>
                <p className="mt-0.5 text-xs text-secondary-text">
                  Fundo da barra com o nome do grupo no layout Básico. Sem banner, usa a cor
                  definida acima.
                </p>
                <div className="mt-3">
                  <DeliveryImageUploadField
                    disabled={!selectedCategory}
                    busy={isUploadingSelected}
                    previewUrl={imagemPreviewUrl}
                    cropPreset={DELIVERY_GRUPO_BANNER_CROP_PRESET}
                    helperText="Após o recorte (máx. 1200×150), a imagem é salva no grupo."
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
              <div className="rounded-lg bg-gray-50 px-3 py-4 text-sm text-secondary-text">
                Modo cor sólida ativo. Ative &quot;Usar imagem como fundo do título&quot; para
                enviar um banner por grupo.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
