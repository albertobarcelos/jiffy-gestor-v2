'use client'

import { useEffect, useState, useCallback } from 'react'

interface ColorPickerModalProps {
  open: boolean
  onClose: () => void
  onSelect: (color: string) => void
}

const normalizeHexColor = (value: string): string => {
  if (!value) return '#CCCCCC'
  let hex = value.trim().replace('#', '')

  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((char) => char + char)
      .join('')
  }

  if (hex.length === 8) {
    hex = hex.slice(2) // remove alpha
  }

  if (hex.length !== 6) {
    return '#CCCCCC'
  }

  return `#${hex.toUpperCase()}`
}

export function ColorPickerModal({ open, onClose, onSelect }: ColorPickerModalProps) {
  const [colors, setColors] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchColors = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/preferencias/cores-disponiveis', {
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || 'Erro ao carregar cores')
      }

      const data = await response.json()
      const lista =
        Array.isArray(data) ? data : Array.isArray(data?.cores) ? data.cores : []

      setColors(
        lista
          .map((cor: string) => normalizeHexColor(cor))
          .filter((cor: string, index: number, arr: string[]) => cor && arr.indexOf(cor) === index)
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar cores')
      setColors([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      fetchColors()
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [open, fetchColors])

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) {
    return null
  }

  const handleSelect = (color: string) => {
    onSelect(color)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-2xl w-[600px] h-[600px] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.2)] flex flex-col">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-primary-text">Selecione uma cor</h2>
            <p className="text-sm text-secondary-text">
              Clique em uma cor para aplicar imediatamente
            </p>
          </div>
          <button
            type="button"
            onClick={fetchColors}
            className="text-sm text-primary underline hover:opacity-80 transition-opacity"
          >
            Recarregar
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <p className="text-error text-sm text-center">{error}</p>
              <button
                type="button"
                onClick={fetchColors}
                className="px-4 py-2 bg-primary text-info rounded-full text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          ) : colors.length === 0 ? (
            <div className="flex items-center justify-center h-full text-secondary-text">
              Nenhuma cor disponível no momento.
            </div>
          ) : (
            <div className="flex flex-wrap gap-[10px]">
              {colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleSelect(color)}
                  className="w-[100px] h-[100px] rounded-2xl border-2 border-transparent hover:border-primary transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  style={{ backgroundColor: color }}
                  aria-label={`Selecionar a cor ${color}`}
                />
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 self-end px-6 py-2 rounded-full border border-secondary-text text-secondary-text hover:bg-secondary-text/10 transition-colors text-sm font-semibold"
        >
          Fechar
        </button>
      </div>
    </div>
  )
}

