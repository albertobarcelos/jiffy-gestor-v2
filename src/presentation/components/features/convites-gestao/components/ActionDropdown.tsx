'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { cn } from '@/src/shared/utils/cn'
import { MdExpandMore } from 'react-icons/md'

interface ActionDropdownProps {
  label: string
  disabled?: boolean
  children: (close: () => void) => ReactNode
}

/**
 * Dropdown reutilizável para a coluna "Grupo" da lista de convites.
 * Trigger com fundo secondary + seta; conteúdo é renderizado via render-prop `children(close)`.
 */
export function ActionDropdown({ label, disabled, children }: ActionDropdownProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const close = useCallback(() => setOpen(false), [])

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(prev => !prev)}
        className={cn(
          'flex w-full items-center justify-between gap-1 rounded bg-secondary px-2.5 py-1 font-nunito text-xs font-normal text-white md:text-sm',
          disabled && 'opacity-50'
        )}
      >
        <span className="truncate">{label}</span>
        <MdExpandMore
          size={16}
          className={cn('shrink-0 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          {children(close)}
        </div>
      )}
    </div>
  )
}
