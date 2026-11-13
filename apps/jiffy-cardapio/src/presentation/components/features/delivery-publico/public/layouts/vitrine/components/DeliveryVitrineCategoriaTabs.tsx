'use client'

import { useEffect, useRef } from 'react'
import { Search } from 'lucide-react'
import type { DeliveryPublicoGrupoViewModel } from '../../../../shared/types/deliveryPublicoViewModel'

type DeliveryVitrineCategoriaTabsProps = {
  grupos: DeliveryPublicoGrupoViewModel[]
  activeGrupoId: string | null
  interactive?: boolean
  buscaAberta?: boolean
  termoBusca?: string
  onGrupoClick?: (grupoId: string) => void
  onSearchToggle?: () => void
  onBuscaChange?: (termo: string) => void
}

export function DeliveryVitrineCategoriaTabs({
  grupos,
  activeGrupoId,
  interactive = false,
  buscaAberta = false,
  termoBusca = '',
  onGrupoClick,
  onSearchToggle,
  onBuscaChange,
}: DeliveryVitrineCategoriaTabsProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const searchPanelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (buscaAberta && interactive) {
      inputRef.current?.focus()
    }
  }, [buscaAberta, interactive])

  useEffect(() => {
    if (!buscaAberta || !interactive) return

    const fecharBusca = () => {
      onBuscaChange?.('')
      onSearchToggle?.()
    }

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (searchPanelRef.current?.contains(target)) return
      fecharBusca()
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') fecharBusca()
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown, { passive: true })
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [buscaAberta, interactive, onBuscaChange, onSearchToggle])

  if (grupos.length === 0) return null

  return (
    <div
      className="relative z-20 border-b bg-white"
      style={{ borderColor: 'var(--delivery-card-border)' }}
    >
      <div className="flex items-center gap-1 px-2 @sm:gap-2 @sm:px-3">
        <div className="min-w-0 flex-1 overflow-x-auto scrollbar-hide">
          <div className="flex w-max min-w-full">
            {grupos.map(grupo => {
              const active = grupo.id === activeGrupoId
              const className = `shrink-0 border-b-2 px-3 py-3 text-sm font-semibold transition-colors @sm:px-4 ${
                active ? 'border-[var(--delivery-primary)]' : 'border-transparent'
              }`

              const style = {
                color: active ? 'var(--delivery-primary)' : 'var(--delivery-text-secondary)',
                fontFamily: 'var(--delivery-font-body)',
              } as const

              if (interactive && onGrupoClick) {
                return (
                  <button
                    key={grupo.id}
                    type="button"
                    onClick={() => onGrupoClick(grupo.id)}
                    className={className}
                    style={style}
                  >
                    {grupo.nome}
                  </button>
                )
              }

              return (
                <span key={grupo.id} className={className} style={style}>
                  {grupo.nome}
                </span>
              )
            })}
          </div>
        </div>

        {/* Reserva o espaço da lupa para a lista não ir por baixo do botão. */}
        <div className="h-10 w-10 shrink-0" aria-hidden />
      </div>

      <div
        ref={searchPanelRef}
        className="absolute inset-y-0 right-2 z-30 flex items-center @sm:right-3"
      >
        <div
          className={`flex items-center overflow-hidden rounded-lg bg-white shadow-sm transition-[max-width,padding] duration-300 ease-out ${
            buscaAberta
              ? 'max-w-[190px] border border-gray-200 pl-1 pr-1 @lg:max-w-[260px]'
              : 'max-w-10 border border-transparent'
          }`}
        >
          <button
            type="button"
            aria-label="Pesquisar produtos"
            aria-expanded={buscaAberta}
            disabled={!interactive || buscaAberta}
            onClick={() => {
              if (!interactive || buscaAberta) return
              onSearchToggle?.()
            }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[var(--delivery-primary)] disabled:cursor-default"
          >
            <Search className="h-5 w-5" aria-hidden />
          </button>

          <div
            className={`overflow-hidden transition-[max-width,opacity] duration-300 ease-out ${
              buscaAberta
                ? 'max-w-[150px] opacity-100 @lg:max-w-[220px]'
                : 'max-w-0 opacity-0'
            }`}
          >
            <label className="block w-[150px] @lg:w-[220px]">
              <span className="sr-only">Pesquisar produtos</span>
              {interactive && onBuscaChange ? (
                <input
                  ref={inputRef}
                  type="search"
                  value={termoBusca}
                  onChange={e => onBuscaChange(e.target.value)}
                  placeholder="Pesquisar…"
                  className="h-9 w-[150px] rounded-md border-0 bg-transparent px-1 text-sm text-gray-700 outline-none @lg:w-[220px]"
                  style={{ fontFamily: 'var(--delivery-font-body)' }}
                />
              ) : (
                <div className="flex h-9 w-[150px] items-center px-1 text-sm text-gray-500 @lg:w-[220px]">
                  Pesquisar…
                </div>
              )}
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}
