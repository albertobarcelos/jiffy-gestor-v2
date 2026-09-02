'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
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
  DELIVERY_PUBLICO_GRUPO_SUGESTOES_NOME,
  findGrupoSugestoesDaCasaCarrier,
  omitGrupoSugestoesDaCasaCarrier,
} from '../../../shared/constants/deliveryPublicoSugestoes'
import { resolveDesignPaletteColors } from '../../../shared/constants/colorPalettes'
import { DesignCategoriaGrupoSortableItem } from '../DesignCategoriaGrupoSortableItem'
import { useDesignCategoriaGrupoActions } from '../../hooks/useDesignCategoriaGrupoActions'

type DesignCategoriasTabProps = {
  config: DeliveryPublicoDesignConfig
  grupos: DesignCategoriaGrupo[]
  menuId: string | null
  hasMenu?: boolean
  isLoading?: boolean
  isError?: boolean
  onChange: (updater: (current: DeliveryPublicoDesignConfig) => DeliveryPublicoDesignConfig) => void
  onGruposChange?: (grupos: DesignCategoriaGrupo[]) => void
}

export function DesignCategoriasTab({
  config,
  grupos,
  menuId,
  hasMenu = true,
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
  } = useDesignCategoriaGrupoActions(menuId)

  const palette = resolveDesignPaletteColors(config)
  const mostrarSugestoes = config.categorias.mostrarSugestoesDaCasa !== false
  const grupoSugestoesReal = useMemo(
    () => findGrupoSugestoesDaCasaCarrier(localGrupos),
    [localGrupos]
  )
  const gruposOrdenaveis = useMemo(
    () => omitGrupoSugestoesDaCasaCarrier(localGrupos),
    [localGrupos]
  )
  const grupoSugestoesExiste = Boolean(grupoSugestoesReal)
  const isSugestoesSelected = Boolean(
    grupoSugestoesReal && selectedCategoryId === grupoSugestoesReal.id
  )
  const selectedCategory = localGrupos.find(c => c.id === selectedCategoryId)
  const selectedNome = selectedCategory?.nome ?? '—'
  const selectedImagemUrl = selectedCategory?.imagemUrl ?? null
  const usarBannerImagem = config.categorias.tituloGrupoFundo === 'imagem'
  const corTemaBarra = palette.primaryDark.toUpperCase()
  const corTemaTexto = '#FFFFFF'
  const corBarraEfetiva = (config.categorias.corBarraTitulo ?? corTemaBarra).toUpperCase()
  const corTextoEfetiva = (config.categorias.corTextoTitulo ?? corTemaTexto).toUpperCase()
  const usaTemaBarra = config.categorias.corBarraTitulo == null
  const usaTemaTexto = config.categorias.corTextoTitulo == null
  const isUploadingSelected = uploadingGrupoId === selectedCategoryId
  const isReordering = reorderingGrupoId != null

  const hasListaGrupos =
    gruposOrdenaveis.length > 0 || (mostrarSugestoes && grupoSugestoesExiste)

  const selectableIds = useMemo(() => {
    const ids = gruposOrdenaveis.map(g => g.id)
    if (mostrarSugestoes && grupoSugestoesReal) {
      return [grupoSugestoesReal.id, ...ids]
    }
    return ids
  }, [gruposOrdenaveis, mostrarSugestoes, grupoSugestoesReal])

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

      const oldIndex = gruposOrdenaveis.findIndex(g => g.id === active.id)
      const newIndex = gruposOrdenaveis.findIndex(g => g.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return

      const previous = localGrupos
      const reorderedOrdenaveis = arrayMove(gruposOrdenaveis, oldIndex, newIndex)
      const nextLocal = grupoSugestoesReal
        ? [grupoSugestoesReal, ...reorderedOrdenaveis]
        : reorderedOrdenaveis
      updateGrupos(nextLocal)

      try {
        const novaPosicao = nextLocal.findIndex(g => g.id === active.id) + 1
        await reordenarGrupo(active.id as string, novaPosicao)
        showToast.success('Ordem atualizada!')
      } catch (error) {
        updateGrupos(previous)
        showToast.error(error instanceof Error ? error.message : 'Erro ao reordenar grupo')
      }
    },
    [
      grupoSugestoesReal,
      gruposOrdenaveis,
      isReordering,
      localGrupos,
      reordenarGrupo,
      updateGrupos,
    ]
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
        // Limpa legado em data URL no design (imagem agora fica no grupo CDN).
        if (isSugestoesSelected) {
          onChange(current => ({
            ...current,
            categorias: {
              ...current.categorias,
              sugestoesDaCasaImagemUrl: null,
            },
          }))
        }
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
      isSugestoesSelected,
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

  if (!hasMenu) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold">Cardápio do delivery não configurado</p>
        <p className="mt-1 text-xs">
          Em Delivery, escolha o cardápio publicado. As categorias desta tela vêm desse
          menu.
        </p>
        <Link
          href="/configuracoes/empresa-delivery"
          className="mt-3 inline-flex text-sm font-semibold text-primary underline-offset-2 hover:underline"
        >
          Ir para Delivery
        </Link>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Não foi possível carregar os grupos do cardápio publicado. Tente recarregar a página.
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

        <div className="space-y-1.5 border-t border-gray-100 pt-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-primary-text">Grupo Sugestões da Casa</p>
              <p className="mt-0.5 text-xs text-secondary-text">
                Exibe no topo os favoritos. Exige um grupo &quot;
                {DELIVERY_PUBLICO_GRUPO_SUGESTOES_NOME}&quot; em Grupos de produtos (aceita sem
                acento / maiúsculas; no cardápio aparece com acento). Também usado para o banner.
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
          {mostrarSugestoes && !grupoSugestoesExiste ? (
            <p className="rounded-lg bg-amber-50 px-2.5 py-2 text-xs text-amber-800">
              Crie o grupo &quot;{DELIVERY_PUBLICO_GRUPO_SUGESTOES_NOME}&quot; (ou &quot;SUGESTOES
              DA CASA&quot;) em Grupos de produtos para exibir no delivery e poder enviar o banner.
            </p>
          ) : null}
        </div>
      </div>

      {!hasListaGrupos ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
          <p className="text-sm font-semibold text-primary-text">Nenhum grupo neste cardápio</p>
          <p className="mt-1 text-xs text-secondary-text">
            Vincule categorias ao cardápio publicado no delivery para personalizar a ordem e os
            banners aqui.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="w-full shrink-0 lg:max-w-[240px]">
            <p className="mb-1.5 text-xs text-secondary-text">Arraste para definir a ordem</p>
            <ul className="space-y-1.5">
              {mostrarSugestoes && grupoSugestoesReal ? (
                <li>
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryId(grupoSugestoesReal.id)}
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

              {gruposOrdenaveis.length > 0 ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={gruposOrdenaveis.map(g => g.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {gruposOrdenaveis.map(cat => (
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
                    ? 'Banner salvo no grupo Sugestões da Casa (CDN). Sem banner, usa a cor definida acima.'
                    : 'Fundo da barra com o nome do grupo no layout Básico. Sem banner, usa a cor definida acima.'}
                </p>
                <div className="mt-3">
                  <DeliveryImageUploadField
                    disabled={!selectedCategoryId}
                    busy={isUploadingSelected}
                    previewUrl={imagemPreviewUrl}
                    cropPreset={DELIVERY_GRUPO_BANNER_CROP_PRESET}
                    helperText="Após o recorte (máx. 1200×150), a imagem é salva no grupo."
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
