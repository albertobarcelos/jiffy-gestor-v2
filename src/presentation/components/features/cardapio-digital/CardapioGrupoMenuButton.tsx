'use client'

import { MdPhotoCamera } from 'react-icons/md'

interface CardapioGrupoMenuButtonProps {
  nome: string
  imagemUrl?: string | null
  selected?: boolean
  onClick: () => void
  /** Tile sem imagem — ex.: botão DESTAQUES */
  solid?: boolean
}

/**
 * Botão quadrado do menu lateral do catálogo.
 * Imagem preenche o tile; nome fica em faixa semitransparente no rodapé.
 */
export default function CardapioGrupoMenuButton({
  nome,
  imagemUrl,
  selected = false,
  onClick,
  solid = false,
}: CardapioGrupoMenuButtonProps) {
  const selectedRingClass = selected
    ? 'ring-2 ring-white ring-offset-2 ring-offset-[var(--cardapio-menu-bg)]'
    : ''

  if (solid) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={selected}
        className={`w-full text-center uppercase px-1 sm:px-3 py-2 sm:py-2.5 rounded-lg text-[10px] sm:text-xs min-h-[44px] transition-shadow ${selected ? 'font-semibold' : 'font-medium'} ${selectedRingClass}`}
        style={{
          backgroundColor: selected
            ? 'var(--cardapio-menu-item-active)'
            : 'var(--cardapio-menu-item)',
          color: selected
            ? 'var(--cardapio-menu-item-active-text)'
            : 'var(--cardapio-menu-item-text)',
        }}
      >
        {nome}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={nome}
      className={`relative w-full aspect-square rounded-lg overflow-hidden p-0 transition-shadow ${selectedRingClass}`}
    >
      {imagemUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imagemUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center pb-7 sm:pb-8"
          style={{ background: 'var(--cardapio-gradient-secondary)' }}
          aria-hidden
        >
          <MdPhotoCamera
            className="w-8 h-8 sm:w-10 sm:h-10 opacity-50"
            style={{ color: 'var(--cardapio-menu-tile-label-text)' }}
          />
        </div>
      )}

      {selected && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.12)' }}
          aria-hidden
        />
      )}

      <div
        className="absolute inset-x-0 bottom-0 px-1 py-1 sm:py-1.5"
        style={{
          backgroundColor: 'var(--cardapio-menu-tile-label-bg)',
          color: 'var(--cardapio-menu-tile-label-text)',
        }}
      >
        <span
          className={`block text-center uppercase text-[10px] sm:text-xs leading-tight line-clamp-2 ${selected ? 'font-semibold' : 'font-medium'}`}
        >
          {nome}
        </span>
      </div>
    </button>
  )
}
