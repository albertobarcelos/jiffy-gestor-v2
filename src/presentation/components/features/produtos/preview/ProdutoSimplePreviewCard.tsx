'use client'

import { useCallback, useRef, useState } from 'react'
import { MdAddAPhoto, MdImageNotSupported } from 'react-icons/md'
import { MENU_PRODUTO_CROP_PRESET } from '@/src/presentation/constants/imageCropPresets'
import { useImageCropFlow } from '@/src/presentation/hooks/useImageCropFlow'
import {
  formatPrecoPreview,
  type ProdutoPreviewModel,
} from './produtoPreviewModel'
import { cn } from '@/src/shared/utils/cn'

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp'

export type ProdutoPreviewImageUpload = {
  enabled: boolean
  busy?: boolean
  /** Texto quando upload está disponível */
  hint?: string
  /** Texto quando upload está desabilitado (ex.: produto ainda não salvo) */
  disabledHint?: string
  onUpload: (file: File) => void | Promise<void>
}

interface ProdutoSimplePreviewCardProps extends ProdutoPreviewModel {
  className?: string
  imageUpload?: ProdutoPreviewImageUpload
}

export function ProdutoSimplePreviewCard({
  nome,
  preco,
  descricao,
  imagemUrl,
  className,
  imageUpload,
}: ProdutoSimplePreviewCardProps) {
  const nomeExibicao = nome.trim() || 'Nome do produto'
  const descricaoExibicao = descricao?.trim() || 'Descrição do produto'
  const imagem = imagemUrl?.trim() || null
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const onUploadRef = useRef(imageUpload?.onUpload)
  onUploadRef.current = imageUpload?.onUpload

  const uploadEnabled = Boolean(imageUpload?.enabled && !imageUpload.busy)
  const showUploadUi = Boolean(imageUpload)

  const { openWithFile, cropModal } = useImageCropFlow({
    preset: MENU_PRODUTO_CROP_PRESET,
    onCropped: file => {
      void onUploadRef.current?.(file)
    },
  })

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!uploadEnabled || !files?.[0]) return
      openWithFile(files[0])
    },
    [uploadEnabled, openWithFile]
  )

  const openFilePicker = useCallback(() => {
    if (!uploadEnabled) return
    inputRef.current?.click()
  }, [uploadEnabled])

  return (
    <>
      <article
        className={cn(
          'overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm',
          className
        )}
      >
        <div
          className={cn(
            'relative aspect-square w-full bg-gray-100',
            showUploadUi && uploadEnabled && 'group cursor-pointer',
            showUploadUi && !uploadEnabled && 'cursor-not-allowed opacity-90'
          )}
          role={showUploadUi ? 'button' : undefined}
          tabIndex={showUploadUi && uploadEnabled ? 0 : undefined}
          title={
            showUploadUi
              ? uploadEnabled
                ? imageUpload?.hint ?? 'Arraste uma imagem ou clique para selecionar'
                : imageUpload?.disabledHint ?? 'Upload indisponível'
              : undefined
          }
          onClick={showUploadUi ? openFilePicker : undefined}
          onKeyDown={
            showUploadUi && uploadEnabled
              ? e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openFilePicker()
                  }
                }
              : undefined
          }
          onDragEnter={
            showUploadUi && uploadEnabled
              ? e => {
                  e.preventDefault()
                  e.stopPropagation()
                  setDragActive(true)
                }
              : undefined
          }
          onDragOver={
            showUploadUi && uploadEnabled
              ? e => {
                  e.preventDefault()
                  e.stopPropagation()
                  e.dataTransfer.dropEffect = 'copy'
                }
              : undefined
          }
          onDragLeave={
            showUploadUi && uploadEnabled
              ? e => {
                  e.preventDefault()
                  e.stopPropagation()
                  if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
                  setDragActive(false)
                }
              : undefined
          }
          onDrop={
            showUploadUi && uploadEnabled
              ? e => {
                  e.preventDefault()
                  e.stopPropagation()
                  setDragActive(false)
                  handleFiles(e.dataTransfer.files)
                }
              : undefined
          }
        >
          {showUploadUi ? (
            <input
              ref={inputRef}
              type="file"
              accept={IMAGE_ACCEPT}
              className="sr-only"
              disabled={!uploadEnabled}
              onChange={e => {
                handleFiles(e.target.files)
                e.target.value = ''
              }}
              aria-hidden
            />
          ) : null}

          {imagem ? (
            // eslint-disable-next-line @next/next/no-img-element -- preview estático
            <img src={imagem} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-3 text-center text-secondary-text">
              <MdImageNotSupported className="h-12 w-12 opacity-50" aria-hidden />
              {showUploadUi ? (
                <p className="text-[10px] leading-tight text-neutral-500">
                  {imageUpload?.busy
                    ? 'Enviando imagem…'
                    : dragActive
                      ? 'Solte para recortar'
                      : uploadEnabled
                        ? (imageUpload?.hint ?? 'Arraste ou clique para enviar')
                        : (imageUpload?.disabledHint ?? 'Upload indisponível')}
                </p>
              ) : null}
            </div>
          )}

          {/* Overlay de upload só quando já há imagem (hover/arraste); no vazio fica só o placeholder cinza */}
          {showUploadUi && uploadEnabled && imagem ? (
            <div
              className={cn(
                'pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/45 px-3 text-center text-white transition-opacity',
                !dragActive && !imageUpload?.busy
                  ? 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
                  : 'opacity-100'
              )}
            >
              <MdAddAPhoto className="h-8 w-8 drop-shadow" aria-hidden />
              <p className="text-[10px] font-medium leading-tight drop-shadow">
                {imageUpload?.busy
                  ? 'Enviando imagem…'
                  : dragActive
                    ? 'Solte para recortar'
                    : (imageUpload?.hint ?? 'Arraste ou clique para enviar')}
              </p>
            </div>
          ) : null}

          {showUploadUi && !uploadEnabled && imageUpload?.disabledHint && imagem ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1.5 text-center text-[10px] leading-tight text-white">
              {imageUpload.disabledHint}
            </div>
          ) : null}
        </div>
        <div className="space-y-1.5 p-3">
          <h3 className="line-clamp-2 text-sm font-semibold uppercase tracking-wide text-primary-text">
            {nomeExibicao}
          </h3>
          <p className="text-base font-bold text-primary">{formatPrecoPreview(preco)}</p>
          <p className="line-clamp-4 whitespace-pre-wrap text-xs leading-relaxed text-secondary-text">
            {descricaoExibicao}
          </p>
        </div>
      </article>
      {showUploadUi ? cropModal : null}
    </>
  )
}
