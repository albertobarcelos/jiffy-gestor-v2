'use client'

import { useRouter } from 'next/navigation'
import { MdViewKanban } from 'react-icons/md'
import { FaWhatsapp } from 'react-icons/fa'
import { GestorEmpresaSelectKiosk } from '../kiosk/GestorEmpresaSelectKiosk'
import { pathQuadroDaSessaoAtual, pathWhatsAppKiosk } from '../sessao/pathsGestorSessao'
import { cn } from '@/src/shared/utils/cn'

type Aba = 'pedidos' | 'whatsapp'

export function JiffyWhatsAppToolbar({ aba }: { aba: Aba }) {
  const router = useRouter()

  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-primary/10 bg-white px-2 py-1.5">
      <GestorEmpresaSelectKiosk />
      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          onClick={() => router.replace(pathQuadroDaSessaoAtual())}
          className={cn(
            'inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium transition',
            aba === 'pedidos'
              ? 'bg-primary text-white'
              : 'text-primary-text hover:bg-primary-bg'
          )}
        >
          <MdViewKanban size={18} aria-hidden />
          Pedidos
        </button>
        <button
          type="button"
          onClick={() => router.replace(pathWhatsAppKiosk())}
          className={cn(
            'inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium transition',
            aba === 'whatsapp'
              ? 'bg-primary text-white'
              : 'text-primary-text hover:bg-primary-bg'
          )}
        >
          <FaWhatsapp size={16} aria-hidden />
          WhatsApp
        </button>
      </div>
    </div>
  )
}
