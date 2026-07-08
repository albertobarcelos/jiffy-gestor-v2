'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import { DELIVERY_IMAGE_ACCEPT } from '@/src/shared/constants/deliveryImageUpload'

interface DeliveryImageUploadFieldProps {
  label?: string
  disabled?: boolean
  busy?: boolean
  previewUrl?: string | null
  helperText?: string
  emptyHint?: string
  onFileSelected: (file: File) => void | Promise<void>
  onClearPreview?: () => void
}

export function DeliveryImageUploadField({
  label = 'Imagem',
  disabled = false,
  busy = false,
  previewUrl,
  helperText,
  emptyHint = 'Arraste uma imagem ou clique para selecionar',
  onFileSelected,
  onClearPreview,
}: DeliveryImageUploadFieldProps) {
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
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>

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
        className={`relative flex w-full flex-col overflow-hidden rounded-lg border-2 border-dashed transition-colors ${
          previewUrl ? 'p-1.5 min-h-[140px]' : 'min-h-[140px]'
        } ${
          dragActive
            ? 'border-primary bg-primary/10'
            : 'border-neutral-400/80 bg-white/50'
        } ${isDisabled ? 'pointer-events-none opacity-60' : 'cursor-pointer'}`}
      >
        {previewUrl ? (
          <div className="relative flex w-full flex-col gap-1">
            <div className="relative w-full">
              {onClearPreview ? (
                <button
                  type="button"
                  title="Remover preview"
                  aria-label="Remover preview"
                  onClick={e => {
                    e.stopPropagation()
                    onClearPreview()
                  }}
                  className="absolute right-0.5 top-0.5 z-10 inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/90 text-neutral-600 shadow-sm ring-1 ring-black/5 transition-colors hover:bg-red-50 hover:text-red-700"
                >
                  <DeleteOutlineRoundedIcon sx={{ fontSize: 20 }} />
                </button>
              ) : null}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Preview da imagem"
                className="mx-auto max-h-40 w-full rounded-md object-contain"
              />
            </div>
            <p className="text-center text-xs text-neutral-500">
              {busy ? 'Enviando imagem...' : 'Clique ou arraste para substituir'}
            </p>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-6 text-center">
            <ImageOutlinedIcon sx={{ fontSize: 36, color: 'var(--color-primary)' }} />
            <p className="text-sm text-neutral-600">{emptyHint}</p>
            <p className="text-xs text-neutral-500">JPEG, PNG ou WebP — máx. 5 MB</p>
          </div>
        )}
      </div>

      {helperText ? <p className="text-xs text-neutral-500">{helperText}</p> : null}
    </div>
  )
}
