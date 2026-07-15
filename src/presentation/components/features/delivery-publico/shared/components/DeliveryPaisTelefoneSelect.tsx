'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MdExpandMore, MdSearch } from 'react-icons/md'
import {
  DELIVERY_PAISES_TELEFONE,
  deliveryPaisFlagSrcSet,
  deliveryPaisFlagUrl,
  findDeliveryPaisTelefone,
  type DeliveryPaisTelefone,
} from '../constants/deliveryPaisesTelefone'

type DeliveryPaisTelefoneSelectProps = {
  value: string
  onChange: (iso2: string) => void
  disabled?: boolean
}

type DropdownPosition = {
  top?: number
  bottom?: number
  left: number
  width: number
  maxHeight: number
}

function PaisBandeira({ iso2, className }: { iso2: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={deliveryPaisFlagUrl(iso2, 40)}
      srcSet={deliveryPaisFlagSrcSet(iso2)}
      alt=""
      width={20}
      height={15}
      loading="lazy"
      decoding="async"
      className={className ?? 'h-[15px] w-5 shrink-0 rounded-[2px] object-cover shadow-sm'}
    />
  )
}

function computeDropdownPosition(trigger: HTMLElement): DropdownPosition {
  const rect = trigger.getBoundingClientRect()
  const gap = 6
  const desiredWidth = Math.min(288, window.innerWidth - 24)
  const left = Math.min(
    Math.max(12, rect.left),
    Math.max(12, window.innerWidth - desiredWidth - 12)
  )
  const spaceBelow = window.innerHeight - rect.bottom - gap - 12
  const spaceAbove = rect.top - gap - 12
  const openUpward = spaceBelow < 220 && spaceAbove > spaceBelow
  const available = openUpward ? spaceAbove : spaceBelow
  const maxHeight = Math.max(160, Math.min(280, available))

  if (openUpward) {
    return {
      bottom: window.innerHeight - rect.top + gap,
      left,
      width: desiredWidth,
      maxHeight,
    }
  }

  return {
    top: rect.bottom + gap,
    left,
    width: desiredWidth,
    maxHeight,
  }
}

export function DeliveryPaisTelefoneSelect({
  value,
  onChange,
  disabled = false,
}: DeliveryPaisTelefoneSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const [position, setPosition] = useState<DropdownPosition | null>(null)
  const [mounted, setMounted] = useState(false)

  const selecionado = useMemo(() => findDeliveryPaisTelefone(value), [value])

  const paisesFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return DELIVERY_PAISES_TELEFONE
    return DELIVERY_PAISES_TELEFONE.filter(pais => {
      return (
        pais.nome.toLowerCase().includes(termo) ||
        pais.iso2.toLowerCase().includes(termo) ||
        pais.ddi.includes(termo.replace(/^\+/, ''))
      )
    })
  }, [busca])

  useEffect(() => {
    setMounted(true)
  }, [])

  useLayoutEffect(() => {
    if (!aberto || !triggerRef.current) {
      setPosition(null)
      return
    }

    const updatePosition = () => {
      if (!triggerRef.current) return
      setPosition(computeDropdownPosition(triggerRef.current))
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [aberto])

  useEffect(() => {
    if (!aberto) return

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (rootRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      setAberto(false)
      setBusca('')
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAberto(false)
        setBusca('')
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    const focusTimer = window.setTimeout(() => searchRef.current?.focus(), 0)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.clearTimeout(focusTimer)
    }
  }, [aberto])

  const handleSelect = (pais: DeliveryPaisTelefone) => {
    onChange(pais.iso2)
    setAberto(false)
    setBusca('')
  }

  const dropdown =
    mounted && aberto && position
      ? createPortal(
          <div
            ref={menuRef}
            className="overflow-hidden rounded-xl border shadow-xl"
            style={{
              position: 'fixed',
              zIndex: 80,
              top: position.top,
              bottom: position.bottom,
              left: position.left,
              width: position.width,
              maxHeight: position.maxHeight,
              backgroundColor: 'var(--delivery-surface, #ffffff)',
              borderColor: 'var(--delivery-border)',
              display: 'flex',
              flexDirection: 'column',
            }}
            role="listbox"
            aria-label="Selecionar país"
          >
            <div
              className="flex shrink-0 items-center gap-2 border-b px-3 py-2"
              style={{ borderColor: 'var(--delivery-border)' }}
            >
              <MdSearch className="h-4 w-4 shrink-0 delivery-text-secondary" aria-hidden />
              <input
                ref={searchRef}
                type="search"
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Buscar país ou DDI"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none delivery-text-primary"
              />
            </div>

            <ul className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain py-1">
              {paisesFiltrados.length === 0 ? (
                <li className="px-3 py-3 text-sm delivery-text-secondary">
                  Nenhum país encontrado
                </li>
              ) : (
                paisesFiltrados.map(pais => {
                  const ativo = pais.iso2 === selecionado.iso2
                  return (
                    <li key={pais.iso2}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={ativo}
                        onClick={() => handleSelect(pais)}
                        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors"
                        style={{
                          backgroundColor: ativo
                            ? 'color-mix(in srgb, var(--delivery-primary) 12%, transparent)'
                            : undefined,
                        }}
                      >
                        <PaisBandeira iso2={pais.iso2} />
                        <span className="min-w-0 flex-1 truncate delivery-text-primary">
                          {pais.nome}
                        </span>
                        <span className="shrink-0 tabular-nums delivery-text-secondary">
                          +{pais.ddi}
                        </span>
                      </button>
                    </li>
                  )
                })
              )}
            </ul>
          </div>,
          document.body
        )
      : null

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-label={`País: ${selecionado.nome}`}
        onClick={() => setAberto(prev => !prev)}
        className="flex items-center gap-1 rounded-lg px-1 py-0.5 text-sm font-medium delivery-text-primary disabled:opacity-60"
      >
        <PaisBandeira iso2={selecionado.iso2} />
        <span className="tabular-nums">+{selecionado.ddi}</span>
        <MdExpandMore
          className={`h-4 w-4 transition-transform ${aberto ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      {dropdown}
    </div>
  )
}
