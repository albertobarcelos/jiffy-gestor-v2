'use client'

import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Store, X } from 'lucide-react'
import { FaInstagram, FaWhatsapp } from 'react-icons/fa'
import { MdPhone } from 'react-icons/md'
import {
  abrirWhatsapp,
  montarLinkWhatsapp,
  telefoneValidoParaWhatsapp,
} from '@/src/shared/utils/whatsappLink'
import { useDeliveryBodyScrollLock } from '../hooks/useDeliveryBodyScrollLock'
import { obterIconeMeioPagamento } from '../utils/obterIconeMeioPagamento'
import type { DeliveryLojaInformacoesData } from '../types/deliveryLojaInformacoes'

type DeliveryLojaInformacoesModalProps = {
  aberto: boolean
  data: DeliveryLojaInformacoesData
  onClose: () => void
}

const SLIDE_TRANSITION = { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const }

function resolvePortalTarget(): HTMLElement | null {
  if (typeof document === 'undefined') return null
  const shell = document.querySelector('.delivery-preview-shell')
  if (shell instanceof HTMLElement) return shell
  return document.body
}

function digitsOnly(value: string | null | undefined): string {
  return String(value ?? '').replace(/\D/g, '')
}

export function DeliveryLojaInformacoesModal({
  aberto,
  data,
  onClose,
}: DeliveryLojaInformacoesModalProps) {
  const titleId = useId()
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)
  useDeliveryBodyScrollLock(aberto)

  useEffect(() => {
    setPortalTarget(resolvePortalTarget())
  }, [aberto])

  const podeWhatsapp = telefoneValidoParaWhatsapp(data.telefone)
  const telDigits = digitsOnly(data.telefone)
  const podeLigar = telDigits.length >= 10
  const whatsappHref = montarLinkWhatsapp(data.telefone, '')
  const instagramUrl = data.instagramUrl?.trim() || null

  if (!portalTarget) return null

  return createPortal(
    <AnimatePresence>
      {aberto ? (
        <>
          <motion.div
            key="loja-informacoes-backdrop"
            className="delivery-vv-overlay z-[60]"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            aria-hidden
          />

          <motion.aside
            key="loja-informacoes-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="delivery-vv-panel z-[60] flex flex-col shadow-2xl"
            style={{ backgroundColor: 'var(--delivery-surface, #ffffff)' }}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={SLIDE_TRANSITION}
          >
            <header
              className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3"
              style={{ borderColor: 'var(--delivery-border, #e5e5e5)' }}
            >
              <h2
                id={titleId}
                className="delivery-font-title min-w-0 truncate text-base font-semibold text-neutral-900"
              >
                {data.nomeLoja}
              </h2>
              <button
                type="button"
                aria-label="Fechar"
                onClick={onClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-700 hover:bg-neutral-100"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4 max-sm:scrollbar-hide">
              <div className="rounded-xl border border-neutral-200 px-3 py-3">
                <div className="flex items-start gap-3">
                  <Store
                    className="mt-0.5 h-5 w-5 shrink-0 text-neutral-700"
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-neutral-900">
                      {data.enderecoTitulo}
                    </p>
                    {data.enderecoDetalhe ? (
                      <p className="mt-0.5 text-sm text-neutral-500">
                        {data.enderecoDetalhe}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              {instagramUrl ? (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-neutral-800"
                >
                  <FaInstagram className="h-5 w-5" aria-hidden />
                  Instagram
                </a>
              ) : null}

              <section className="mt-5 border-t border-neutral-200 pt-4">
                <h3 className="text-sm font-bold text-neutral-900">Contato</h3>
                <div className="mt-3 grid grid-cols-1 gap-2 @sm:grid-cols-2">
                  {podeWhatsapp && whatsappHref ? (
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => {
                        e.preventDefault()
                        abrirWhatsapp(data.telefone, '')
                      }}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-neutral-300 px-3 text-[11px] font-semibold uppercase tracking-wide text-neutral-800"
                    >
                      <FaWhatsapp className="h-4 w-4 text-green-600" aria-hidden />
                      Enviar mensagem
                    </a>
                  ) : (
                    <span className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-neutral-200 px-3 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                      <FaWhatsapp className="h-4 w-4" aria-hidden />
                      Enviar mensagem
                    </span>
                  )}

                  {podeLigar ? (
                    <a
                      href={`tel:+${telDigits.startsWith('55') ? telDigits : `55${telDigits}`}`}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-neutral-300 px-3 text-[11px] font-semibold uppercase tracking-wide text-neutral-800"
                    >
                      <MdPhone className="h-4 w-4" aria-hidden />
                      Ligar para a empresa
                    </a>
                  ) : (
                    <span className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-neutral-200 px-3 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                      <MdPhone className="h-4 w-4" aria-hidden />
                      Ligar para a empresa
                    </span>
                  )}
                </div>
              </section>

              <section className="mt-5 border-t border-neutral-200 pt-4">
                <h3 className="text-sm font-bold text-neutral-900">
                  Horários de entrega e retirada
                </h3>
                <ul className="mt-3 space-y-2">
                  {data.horarios.map(item => (
                    <li
                      key={item.diaLabel}
                      className="flex items-baseline justify-between gap-3 text-sm"
                    >
                      <span className="text-neutral-800">{item.diaLabel}</span>
                      <span className="shrink-0 text-neutral-600">
                        {item.horarioLabel}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="mt-5 border-t border-neutral-200 pt-4 pb-2">
                <h3 className="text-sm font-bold text-neutral-900">
                  Formas de pagamento
                </h3>
                <p className="mt-1 text-sm font-semibold text-neutral-800">
                  Pagamento ao receber o pedido
                </p>
                {data.meiosPagamento.length === 0 ? (
                  <p className="mt-3 text-sm text-neutral-500">
                    Nenhuma forma de pagamento informada.
                  </p>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {data.meiosPagamento.map(meio => {
                      const Icon = obterIconeMeioPagamento(meio.nome)
                      return (
                        <span
                          key={meio.id}
                          className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-neutral-100 px-2.5 py-1.5 text-xs font-medium text-neutral-800"
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          <span className="truncate">{meio.nome}</span>
                        </span>
                      )
                    })}
                  </div>
                )}
              </section>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>,
    portalTarget
  )
}
