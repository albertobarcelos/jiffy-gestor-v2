'use client'

import { FaWhatsapp } from 'react-icons/fa'
import { MdNotificationsNone, MdQrCode2 } from 'react-icons/md'
import { useState } from 'react'
import { CanalWhatsAppDeliverySection } from '@/src/presentation/components/features/configuracoes/CanalWhatsAppDeliverySection'
import { NotificacoesWhatsAppAvisosSection } from '@/src/presentation/components/features/configuracoes/NotificacoesWhatsAppAvisosSection'

/**
 * Etapa Delivery — Notificações WhatsApp.
 * Canal (QR) + quais avisos enviar ao cliente.
 */
export function NotificacoesWhatsAppDeliveryTab() {
  const [canalConectado, setCanalConectado] = useState(false)

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-gray-50 p-4 sm:p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-primary">Notificações WhatsApp</h1>
        <p className="mt-1 text-sm text-secondary-text">
          Avisos automáticos do pedido no WhatsApp do cliente.
        </p>
      </header>

      <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
              <MdQrCode2 className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <h2 className="text-base font-semibold text-primary-text">Canal WhatsApp</h2>
              <p className="mt-1 text-sm text-secondary-text">
                Conecte o número da loja pelo QR Code. O pedido gestor usa este canal para
                avisar o cliente — não é o WhatsApp do atendente.
              </p>
            </div>
          </div>
          <CanalWhatsAppDeliverySection onConectadoChange={setCanalConectado} />
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
              <MdNotificationsNone className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <h2 className="text-base font-semibold text-primary-text">Quais avisos enviar</h2>
              <p className="mt-1 text-sm text-secondary-text">
                O cliente recebe no WhatsApp quando o pedido muda de status.
              </p>
            </div>
          </div>
          <NotificacoesWhatsAppAvisosSection canalConectado={canalConectado} />
        </section>

        <p className="flex items-center justify-center gap-2 text-xs text-secondary-text">
          <FaWhatsapp className="h-4 w-4 text-secondary" aria-hidden />
          Recomendado. Não bloqueia o restante do Delivery.
        </p>
      </div>
    </div>
  )
}
