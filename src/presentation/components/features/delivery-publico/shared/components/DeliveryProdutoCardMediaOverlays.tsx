'use client'

import { Plus } from 'lucide-react'

type DeliveryProdutoCardMediaOverlaysProps = {
  produtoNome: string
  interactive?: boolean
  temComplementos?: boolean
  quantidadeNoCarrinho?: number
  onOpen?: () => void
  onAddRapido?: () => void
  onAbrirCarrinho?: () => void
  /** Tamanho do botão "+" (default sm). */
  addSize?: 'sm' | 'md'
}

/**
 * Overlays comuns em cards com imagem dominante (Vitrine / Grade / Catálogo / Sugestões):
 * hit area de abrir, badge de qty e atalho de add rápido.
 */
export function DeliveryProdutoCardMediaOverlays({
  produtoNome,
  interactive = false,
  temComplementos = false,
  quantidadeNoCarrinho = 0,
  onOpen,
  onAddRapido,
  onAbrirCarrinho,
  addSize = 'sm',
}: DeliveryProdutoCardMediaOverlaysProps) {
  const podeAddRapido = interactive && !temComplementos && Boolean(onAddRapido)
  const addClass =
    addSize === 'md'
      ? 'h-8 w-8'
      : 'h-7 w-7'
  const plusClass = addSize === 'md' ? 'h-5 w-5' : 'h-4 w-4'

  return (
    <>
      {interactive && onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Ver detalhes de ${produtoNome}`}
          className="absolute inset-0 z-0"
        />
      ) : null}

      {quantidadeNoCarrinho > 0 ? (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation()
            onAbrirCarrinho?.()
          }}
          aria-label={`${quantidadeNoCarrinho} no carrinho — editar ${produtoNome}`}
          className="absolute bottom-1.5 left-1.5 z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white shadow-sm"
        >
          {quantidadeNoCarrinho > 99 ? '99+' : quantidadeNoCarrinho}
        </button>
      ) : null}

      {podeAddRapido ? (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation()
            onAddRapido?.()
          }}
          aria-label={`Adicionar ${produtoNome} ao carrinho`}
          className={`absolute bottom-1.5 right-1.5 z-10 flex ${addClass} items-center justify-center rounded-full shadow-sm transition-transform active:scale-95`}
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.92)' }}
        >
          <Plus
            className={plusClass}
            strokeWidth={2.5}
            style={{ color: 'var(--delivery-primary)' }}
            aria-hidden
          />
        </button>
      ) : null}
    </>
  )
}
