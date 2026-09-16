'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MdLogout, MdViewKanban } from 'react-icons/md'
import { FaWhatsapp } from 'react-icons/fa'
import { GestorEmpresaSelectKiosk } from '../kiosk/GestorEmpresaSelectKiosk'
import { pathQuadroDaSessaoAtual, pathWhatsAppKiosk } from '../sessao/pathsGestorSessao'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { disconnectHubTab } from '@/src/presentation/utils/disconnectHubTab'
import { cn } from '@/src/shared/utils/cn'

type Aba = 'pedidos' | 'whatsapp'

function SpinnerBotao({ className }: { className: string }) {
  return (
    <span
      className={cn(
        'h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-t-transparent',
        className
      )}
      aria-hidden
    />
  )
}

export function JiffyWhatsAppToolbar({ aba }: { aba: Aba }) {
  const router = useRouter()
  const logoutHub = useAuthStore(s => s.logoutHub)
  const [indoPara, setIndoPara] = useState<Aba | null>(null)
  const aTrocar = indoPara != null && indoPara !== aba

  const ir = (prox: Aba) => {
    if (prox === aba || indoPara) return
    setIndoPara(prox)
    router.replace(prox === 'whatsapp' ? pathWhatsAppKiosk() : pathQuadroDaSessaoAtual())
  }

  const sair = () => {
    if (aTrocar) return
    void disconnectHubTab({ logoutHub })
  }

  return (
    <>
      {aTrocar ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-white/90"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <JiffyLoading
            text={indoPara === 'whatsapp' ? 'A abrir o WhatsApp…' : 'A abrir os pedidos…'}
          />
        </div>
      ) : null}

      <div className="relative z-50 flex shrink-0 items-center gap-2 border-b border-primary/10 bg-white px-2 py-1.5">
        <GestorEmpresaSelectKiosk />
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            disabled={aTrocar}
            onClick={() => ir('pedidos')}
            className={cn(
              'inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium transition disabled:opacity-80',
              aba === 'pedidos' || indoPara === 'pedidos'
                ? 'bg-primary text-white'
                : 'text-primary-text hover:bg-primary-bg'
            )}
          >
            {indoPara === 'pedidos' && aba !== 'pedidos' ? (
              <SpinnerBotao className="border-white" />
            ) : (
              <MdViewKanban size={18} aria-hidden />
            )}
            Pedidos
          </button>
          <button
            type="button"
            disabled={aTrocar}
            onClick={() => ir('whatsapp')}
            className={cn(
              'inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium transition disabled:opacity-80',
              aba === 'whatsapp' || indoPara === 'whatsapp'
                ? 'bg-primary text-white'
                : 'text-primary-text hover:bg-primary-bg'
            )}
            aria-busy={indoPara === 'whatsapp' && aba !== 'whatsapp'}
          >
            {indoPara === 'whatsapp' && aba !== 'whatsapp' ? (
              <SpinnerBotao className="border-white" />
            ) : (
              <FaWhatsapp size={16} aria-hidden />
            )}
            {indoPara === 'whatsapp' && aba !== 'whatsapp' ? 'A abrir…' : 'WhatsApp'}
          </button>
          <button
            type="button"
            disabled={aTrocar}
            onClick={sair}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-600 transition hover:bg-primary-bg hover:text-gray-900 disabled:opacity-80"
            aria-label="Sair"
            title="Sair"
          >
            <MdLogout size={18} aria-hidden />
          </button>
        </div>
      </div>
    </>
  )
}
