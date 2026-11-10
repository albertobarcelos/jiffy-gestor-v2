'use client'

import { useEffect, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MdClose } from 'react-icons/md'

export type CardapioMesaSidePanelProps = {
  open: boolean
  onClose: () => void
  title?: ReactNode
  /** Conteúdo do painel (área com scroll). */
  children: ReactNode
  /** Rodapé fixo (ex.: botão adicionar / enviar pedido). */
  footer?: ReactNode
  /** Largura do painel. */
  panelClassName?: string
  /** Fecha ao clicar no overlay. @default true */
  closeOnOverlay?: boolean
  /** Fecha com Escape. @default true */
  closeOnEscape?: boolean
  /** `aria-label` do dialog quando não há título textual. */
  ariaLabel?: string
  zIndexClassName?: string
}

/**
 * Painel lateral alinhado à direita, com slide da direita → esquerda (mesmo padrão
 * visual do delivery público). Reutilizável no fluxo cardápio mesa QR.
 */
export default function CardapioMesaSidePanel({
  open,
  onClose,
  title,
  children,
  footer,
  panelClassName = 'w-full max-w-md sm:max-w-lg',
  closeOnOverlay = true,
  closeOnEscape = true,
  ariaLabel = 'Painel',
  zIndexClassName = 'z-[60]',
}: CardapioMesaSidePanelProps) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open || !closeOnEscape) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, closeOnEscape, onClose])

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            key="cardapio-mesa-side-overlay"
            className={`fixed inset-0 ${zIndexClassName}`}
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={closeOnOverlay ? onClose : undefined}
            aria-hidden
          />

          <motion.aside
            key="cardapio-mesa-side-panel"
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === 'string' ? title : ariaLabel}
            className={`fixed inset-y-0 right-0 flex h-[100dvh] max-h-[100dvh] flex-col shadow-2xl ${panelClassName} ${zIndexClassName}`}
            style={{ backgroundColor: 'var(--cardapio-bg-secondary, #1a1a1a)' }}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {title != null ? (
              <header
                className="flex shrink-0 items-center gap-3 border-b px-4 py-3"
                style={{ borderColor: 'var(--cardapio-border, #333)' }}
              >
                <div
                  className="min-w-0 flex-1 text-lg font-bold"
                  style={{ color: 'var(--cardapio-text-primary)' }}
                >
                  {title}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full p-2 transition hover:opacity-80"
                  style={{ color: 'var(--cardapio-text-primary)' }}
                  aria-label="Fechar"
                >
                  <MdClose className="h-6 w-6" />
                </button>
              </header>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="absolute right-3 top-3 z-10 rounded-full p-2"
                style={{
                  color: 'var(--cardapio-text-primary)',
                  backgroundColor: 'var(--cardapio-bg-elevated, rgba(0,0,0,0.35))',
                }}
                aria-label="Fechar"
              >
                <MdClose className="h-6 w-6" />
              </button>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>

            {footer ? (
              <footer
                className="shrink-0 border-t p-4"
                style={{ borderColor: 'var(--cardapio-border, #333)' }}
              >
                {footer}
              </footer>
            ) : null}
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  )
}
