'use client'

import { useEffect, useState, useCallback } from 'react'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { JiffySidePanelModal } from '@/src/presentation/components/ui/jiffy-side-panel-modal'

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
      .map(char => char + char)
      .join('')
  }

  if (hex.length === 8) {
    hex = hex.slice(2)
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
      const lista = Array.isArray(data) ? data : Array.isArray(data?.cores) ? data.cores : []

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
    }
  }, [open, fetchColors])

  const handleSelect = (color: string) => {
    onSelect(color)
    onClose()
  }

  return (
    <JiffySidePanelModal
      open={open}
      onClose={onClose}
      title="Selecione uma cor"
      panelClassName="w-[min(32rem,100vw)] max-w-[100vw] sm:w-[min(38rem,90vw)]"
      scrollableBody
      footerVariant="bar"
      footerActions={{
        showCancel: true,
        cancelLabel: 'Fechar',
        onCancel: onClose,
        cancelVariant: 'primary',
      }}
    >
      <div className="space-y-4 px-2 pb-2 md:px-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm text-secondary-text">
            Clique em uma cor para aplicar imediatamente
          </p>
        </div>

        {isLoading ? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 py-8">
            <JiffyLoading />
          </div>
        ) : error ? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 py-8">
            <p className="text-center text-sm text-error">{error}</p>
            <button
              type="button"
              onClick={() => void fetchColors()}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-info transition-colors hover:bg-primary/90"
            >
              Tentar novamente
            </button>
          </div>
        ) : colors.length === 0 ? (
          <div className="flex min-h-[30vh] items-center justify-center text-secondary-text">
            Nenhuma cor disponível no momento.
          </div>
        ) : (
          <div className="flex flex-wrap gap-[10px] pb-4">
            {colors.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => handleSelect(color)}
                className="h-[50px] w-[50px] rounded-lg border-2 border-transparent transition-all duration-200 hover:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 md:h-[100px] md:w-[100px]"
                style={{ backgroundColor: color }}
                aria-label={`Selecionar a cor ${color}`}
              />
            ))}
          </div>
        )}
      </div>
    </JiffySidePanelModal>
  )
}
