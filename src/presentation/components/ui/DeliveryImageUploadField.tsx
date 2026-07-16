'use client'

import { useCallback, useRef, useState } from 'react'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import { DELIVERY_IMAGE_ACCEPT } from '@/src/shared/constants/deliveryImageUpload'
import { DELIVERY_PRODUTO_CROP_PRESET } from '@/src/presentation/constants/imageCropPresets'
import { useImageCropFlow } from '@/src/presentation/hooks/useImageCropFlow'
import type { ImageCropPreset } from '@/src/presentation/utils/imageCrop'
import { cn } from '@/src/shared/utils/cn'

type DeliveryImageUploadVariant = 'default' | 'logo' | 'banner'

interface DeliveryImageUploadFieldProps {
  label?: string
  variant?: DeliveryImageUploadVariant
  disabled?: boolean
  busy?: boolean
  previewUrl?: string | null
  helperText?: string
  emptyHint?: string
  /** Se informado, abre o modal de crop antes de chamar onFileSelected. */
  cropPreset?: ImageCropPreset
  onFileSelected: (file: File) => void | Promise<void>
  onClearPreview?: () => void
}

const VARIANT_STYLES: Record<
  DeliveryImageUploadVariant,
  { dropzone: string; previewImage: string; emptyIcon: number; emptyPadding: string }
> = {
  default: {
    dropzone: 'min-h-[120px] w-full',
    previewImage: 'max-h-40 w-full',
    emptyIcon: 36,
    emptyPadding: 'px-3 py-4',
  },
  logo: {
    dropzone: 'h-36 w-36 shrink-0',
    previewImage: 'max-h-32 max-w-full',
    emptyIcon: 28,
    emptyPadding: 'px-2 py-3',
  },
  banner: {
    dropzone: 'min-h-[7rem] w-full',
    previewImage: 'max-h-28 w-full',
    emptyIcon: 28,
    emptyPadding: 'px-3 py-3',
  },
}

const CROP_DROPZONE_PX = 280

/** Dropzone alinhado ao crop delivery (máx. 280×280). */
const CROP_SQUARE_STYLES = {
  dropzone: 'box-border shrink-0',
  previewImage: 'max-h-full max-w-full object-contain',
  emptyIcon: 32,
  emptyPadding: 'px-3 py-3',
} as const

export function DeliveryImageUploadField({
  label,
  variant = 'default',
  disabled = false,
  busy = false,
  previewUrl,
  helperText,
  emptyHint = 'Arraste uma imagem ou clique para selecionar',
  cropPreset,
  onFileSelected,
  onClearPreview,
}: DeliveryImageUploadFieldProps) {
  const styles = cropPreset ? CROP_SQUARE_STYLES : VARIANT_STYLES[variant]
  const isLogo = variant === 'logo'
  const isCropSquare = Boolean(cropPreset)
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const onFileSelectedRef = useRef(onFileSelected)
  onFileSelectedRef.current = onFileSelected

  const isDisabled = disabled || busy

  const { openWithFile, cropModal } = useImageCropFlow({
    // Hook sempre precisa de preset; só usamos openWithFile quando cropPreset existe.
    preset: cropPreset ?? DELIVERY_PRODUTO_CROP_PRESET,
    onCropped: file => {
      void onFileSelectedRef.current(file)
    },
  })

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      const file = files?.[0]
      if (!file || isDisabled) return
      if (cropPreset) {
        openWithFile(file)
        return
      }
      await onFileSelected(file)
    },
    [isDisabled, cropPreset, openWithFile, onFileSelected]
  )

  return (
    <div
      className={cn(
        'space-y-1',
        isCropSquare && 'flex w-full flex-col items-center'
      )}
    >
      {label ? (
        <label
          className={cn(
            'block text-sm font-medium text-gray-700',
            isCropSquare && 'w-full text-center'
          )}
        >
          {label}
        </label>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept={DELIVERY_IMAGE_ACCEPT}
        className="sr-only"
        disabled={isDisabled}
        onChange={e => {
          void handleFiles(e.target.files)
          e.target.value = ''
        }}
        aria-hidden
      />

      <div
        role="button"
        tabIndex={isDisabled ? -1 : 0}
        onKeyDown={e => {
          if (isDisabled) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onClick={() => {
          if (isDisabled) return
          inputRef.current?.click()
        }}
        onDragEnter={e => {
          if (isDisabled) return
          e.preventDefault()
          setDragActive(true)
        }}
        onDragOver={e => {
          if (isDisabled) return
          e.preventDefault()
          e.dataTransfer.dropEffect = 'copy'
        }}
        onDragLeave={e => {
          e.preventDefault()
          if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
          setDragActive(false)
        }}
        onDrop={e => {
          if (isDisabled) return
          e.preventDefault()
          setDragActive(false)
          void handleFiles(e.dataTransfer.files)
        }}
        style={
          isCropSquare
            ? {
                width: CROP_DROPZONE_PX,
                height: CROP_DROPZONE_PX,
                maxWidth: 'min(280px, 100%)',
                maxHeight: 'min(280px, 100%)',
              }
            : undefined
        }
        className={cn(
          'relative flex flex-col overflow-hidden rounded-lg border-2 border-dashed transition-colors',
          previewUrl ? 'p-1.5' : '',
          styles.dropzone,
          isCropSquare && 'aspect-square',
          dragActive ? 'border-primary bg-primary/10' : 'border-neutral-400/80 bg-white/50',
          isDisabled ? 'pointer-events-none opacity-60' : 'cursor-pointer'
        )}
      >
        {previewUrl ? (
          <div className="relative flex h-full w-full flex-col items-center justify-center gap-0.5">
            <div className="relative flex w-full items-center justify-center">
              {onClearPreview ? (
                <button
                  type="button"
                  title="Remover preview"
                  aria-label="Remover preview"
                  onClick={e => {
                    e.stopPropagation()
                    onClearPreview()
                  }}
                  className="absolute right-0 top-0 z-10 inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/90 text-neutral-600 shadow-sm ring-1 ring-black/5 transition-colors hover:bg-red-50 hover:text-red-700"
                >
                  <DeleteOutlineRoundedIcon sx={{ fontSize: isLogo || isCropSquare ? 16 : 20 }} />
                </button>
              ) : null}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Preview da imagem"
                className={cn('mx-auto rounded-md object-contain', styles.previewImage)}
              />
            </div>
            {!isLogo && !isCropSquare ? (
              <p className="text-center text-xs text-neutral-500">
                {busy ? 'Enviando imagem...' : 'Clique ou arraste para substituir'}
              </p>
            ) : null}
            {isCropSquare && busy ? (
              <p className="absolute bottom-1 left-0 right-0 text-center text-[10px] text-neutral-500">
                Enviando imagem...
              </p>
            ) : null}
          </div>
        ) : (
          <div
            className={cn(
              'flex h-full flex-1 flex-col items-center justify-center gap-1 text-center',
              styles.emptyPadding
            )}
          >
            <ImageOutlinedIcon sx={{ fontSize: styles.emptyIcon, color: 'var(--color-primary)' }} />
            <p
              className={cn(
                'text-neutral-600',
                isLogo || isCropSquare ? 'text-[10px] leading-tight px-1' : 'text-sm'
              )}
            >
              {isLogo ? 'Selecionar' : emptyHint}
            </p>
            {!isLogo ? (
              <p className="text-xs text-neutral-500">
                JPEG, PNG ou WebP — máx. {cropPreset ? '1 MB' : '5 MB'}
              </p>
            ) : null}
          </div>
        )}
      </div>

      {helperText ? (
        <p
          className={cn(
            'text-xs text-neutral-500',
            isCropSquare && 'w-full max-w-[280px] text-center'
          )}
        >
          {helperText}
        </p>
      ) : null}
      {cropPreset ? cropModal : null}
    </div>
  )
}
