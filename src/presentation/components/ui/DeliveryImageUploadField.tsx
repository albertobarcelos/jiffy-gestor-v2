'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import { DELIVERY_IMAGE_ACCEPT } from '@/src/shared/constants/deliveryImageUpload'
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

export function DeliveryImageUploadField({
  label,
  variant = 'default',
  disabled = false,
  busy = false,
  previewUrl,
  helperText,
  emptyHint = 'Arraste uma imagem ou clique para selecionar',
  onFileSelected,
  onClearPreview,
}: DeliveryImageUploadFieldProps) {
  const styles = VARIANT_STYLES[variant]
  const isLogo = variant === 'logo'
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)

  const isDisabled = disabled || busy

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      const file = files?.[0]
      if (!file || isDisabled) return
      await onFileSelected(file)
    },
    [isDisabled, onFileSelected]
  )

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  return (
    <div className="space-y-1">
      {label ? <label className="block text-sm font-medium text-gray-700">{label}</label> : null}

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
        className={cn(
          'relative flex flex-col overflow-hidden rounded-lg border-2 border-dashed transition-colors',
          previewUrl ? 'p-1.5' : '',
          styles.dropzone,
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
                  <DeleteOutlineRoundedIcon sx={{ fontSize: isLogo ? 16 : 20 }} />
                </button>
              ) : null}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Preview da imagem"
                className={cn('mx-auto rounded-md object-contain', styles.previewImage)}
              />
            </div>
            {!isLogo ? (
              <p className="text-center text-xs text-neutral-500">
                {busy ? 'Enviando imagem...' : 'Clique ou arraste para substituir'}
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
            <p className={cn('text-neutral-600', isLogo ? 'text-[10px] leading-tight' : 'text-sm')}>
              {isLogo ? 'Selecionar' : emptyHint}
            </p>
            {!isLogo ? (
              <p className="text-xs text-neutral-500">JPEG, PNG ou WebP — máx. 5 MB</p>
            ) : null}
          </div>
        )}
      </div>

      {helperText ? <p className="text-xs text-neutral-500">{helperText}</p> : null}
    </div>
  )
}
