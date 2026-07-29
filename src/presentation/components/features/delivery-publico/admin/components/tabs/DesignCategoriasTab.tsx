'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { cn } from '@/src/shared/utils/cn'
import { showToast } from '@/src/shared/utils/toast'
import type { DeliveryPublicoDesignConfig } from '../../../shared/types/deliveryPublicoDesignConfig'
import type { DesignCategoriaGrupo } from '../../../shared/types/designCategoriaGrupo'
import {
  DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID,
  DELIVERY_PUBLICO_GRUPO_SUGESTOES_NOME,
} from '../../../shared/constants/deliveryPublicoSugestoes'
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

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Falha ao ler a imagem'))
    reader.readAsDataURL(file)
  })
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
  const [isUploadingSugestoes, setIsUploadingSugestoes] = useState(false)

  const {
    reordenarGrupo,
    uploadImagemGrupo,
    patchGrupoImagemUrl,
    uploadingGrupoId,
    reorderingGrupoId,
  } = useDesignCategoriaGrupoActions()

  const palette = resolveDesignPaletteColors(config)
  const mostrarSugestoes = config.categorias.mostrarSugestoesDaCasa !== false
  const isSugestoesSelected = selectedCategoryId === DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID
  const selectedCategory = isSugestoesSelected
    ? null
    : localGrupos.find(c => c.id === selectedCategoryId)
  const selectedNome = isSugestoesSelected
    ? DELIVERY_PUBLICO_GRUPO_SUGESTOES_NOME
    : (selectedCategory?.nome ?? '—')
  const selectedImagemUrl = isSugestoesSelected
    ? config.categorias.sugestoesDaCasaImagemUrl
    : (selectedCategory?.imagemUrl ?? null)
  const usarBannerImagem = config.categorias.tituloGrupoFundo === 'imagem'
  const corTemaBarra = palette.primaryDark.toUpperCase()
  const corTemaTexto = '#FFFFFF'
  const corBarraEfetiva = (config.categorias.corBarraTitulo ?? corTemaBarra).toUpperCase()
  const corTextoEfetiva = (config.categorias.corTextoTitulo ?? corTemaTexto).toUpperCase()
  const usaTemaBarra = config.categorias.corBarraTitulo == null
  const usaTemaTexto = config.categorias.corTextoTitulo == null
  const isUploadingSelected =
    (isSugestoesSelected && isUploadingSugestoes) || uploadingGrupoId === selectedCategoryId
  const isReordering = reorderingGrupoId != null

  const hasListaGrupos = mostrarSugestoes || localGrupos.length > 0

  const selectableIds = useMemo(() => {
    const ids = localGrupos.map(g => g.id)
    return mostrarSugestoes ? [DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID, ...ids] : ids
  }, [localGrupos, mostrarSugestoes])

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
    if (selectableIds.length === 0) {
      setSelectedCategoryId('')
      return
    }
    if (!selectableIds.includes(selectedCategoryId)) {
      setSelectedCategoryId(selectableIds[0])
    }
  }, [selectableIds, selectedCategoryId])

  useEffect(() => {
    setImagemPreviewUrl(prev => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
      return selectedImagemUrl ?? null
    })
  }, [selectedCategoryId, selectedImagemUrl])

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id || isReordering) return
      if (
        active.id === DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID ||
        over.id === DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID
      ) {
        return
      }

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

      if (selectedCategoryId === DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID) {
        setIsUploadingSugestoes(true)
        const toastId = showToast.loading('Salvando banner…')
        try {
          const dataUrl = await fileToDataUrl(file)
          onChange(current => ({
            ...current,
            categorias: {
              ...current.categorias,
              sugestoesDaCasaImagemUrl: dataUrl,
            },
          }))
          setImagemPreviewUrl(prev => {
            if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
            return dataUrl
          })
          showToast.successLoading(toastId, 'Banner de Sugestões salvo!')
        } catch (error) {
          setImagemPreviewUrl(prev => {
            if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
            return config.categorias.sugestoesDaCasaImagemUrl ?? null
          })
          showToast.errorLoading(
            toastId,
            error instanceof Error ? error.message : 'Erro ao salvar banner'
          )
        } finally {
          setIsUploadingSugestoes(false)
        }
        return
      }

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
      config.categorias.sugestoesDaCasaImagemUrl,
      localGrupos,
      onChange,
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
      return selectedImagemUrl ?? null
    })
  }, [selectedImagemUrl])

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
            label={mostrarSugestoes ? 'ON' : 'OFF'}
            labelPosition="start"
            checked={mostrarSugestoes}
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

      {!hasListaGrupos ? (
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
            <ul className="space-y-1.5">
              {mostrarSugestoes ? (
                <li>
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryId(DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg border-2 px-3 py-2.5 text-left text-sm font-semibold transition-colors',
                      isSugestoesSelected
                        ? 'border-secondary bg-secondary/5 text-primary-text'
                        : 'border-gray-200 text-primary-text hover:border-gray-300'
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {DELIVERY_PUBLICO_GRUPO_SUGESTOES_NOME}
                    </span>
                    <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-secondary-text">
                      Fixo
                    </span>
                  </button>
                </li>
              ) : null}

              {localGrupos.length > 0 ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={localGrupos.map(g => g.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {localGrupos.map(cat => (
                      <DesignCategoriaGrupoSortableItem
                        key={cat.id}
                        grupo={cat}
                        isSelected={cat.id === selectedCategoryId}
                        disabled={isReordering}
                        onSelect={setSelectedCategoryId}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              ) : null}
            </ul>
          </div>

          <div className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white p-3">
            {usarBannerImagem ? (
              <>
                <p className="text-sm font-semibold text-primary-text">
                  Banner · {selectedNome}
                </p>
                <p className="mt-0.5 text-xs text-secondary-text">
                  {isSugestoesSelected
                    ? 'Fundo da barra do grupo fixo Sugestões da Casa. Sem banner, usa a cor definida acima.'
                    : 'Fundo da barra com o nome do grupo no layout Básico. Sem banner, usa a cor definida acima.'}
                </p>
                <div className="mt-3">
                  <DeliveryImageUploadField
                    disabled={!selectedCategoryId}
                    busy={isUploadingSelected}
                    previewUrl={imagemPreviewUrl}
                    cropPreset={DELIVERY_GRUPO_BANNER_CROP_PRESET}
                    helperText={
                      isSugestoesSelected
                        ? 'Após o recorte (máx. 1200×150), o banner é salvo no design. Publique para aplicar na loja.'
                        : 'Após o recorte (máx. 1200×150), a imagem é salva no grupo.'
                    }
                    emptyHint="Arraste uma imagem ou clique para selecionar"
                    onFileSelected={handleImagemUpload}
                    onClearPreview={
                      imagemPreviewUrl?.startsWith('blob:') &&
                      imagemPreviewUrl !== selectedImagemUrl
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
