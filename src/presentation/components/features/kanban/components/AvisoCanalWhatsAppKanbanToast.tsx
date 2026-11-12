'use client'

import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { MdClose } from 'react-icons/md'
import {
  gravarSnooze5Dias,
  limparSnooze,
} from '@/src/presentation/components/features/kanban/rules/whatsappKanbanAviso.storage'

export const TOAST_AVISO_WHATSAPP_KANBAN_ID = 'aviso-canal-whatsapp-kanban'

type AvisoCanalWhatsAppKanbanToastProps = {
  toastId: string
  empresaId: string
  onConfigurar: () => void
}

/**
 * Conteúdo do toast de aviso WhatsApp no Kanban (com snooze de 5 dias).
 * Marcar o checkbox já grava/limpa o snooze no localStorage.
 * Clique fora do toast fecha imediatamente.
 */
export function AvisoCanalWhatsAppKanbanToast({
  toastId,
  empresaId,
  onConfigurar,
}: AvisoCanalWhatsAppKanbanToastProps) {
  const [avisarEm5Dias, setAvisarEm5Dias] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fecharSeCliqueFora = (event: PointerEvent) => {
      const root = rootRef.current
      if (!root) return
      const target = event.target
      if (!(target instanceof Node)) return
      if (root.contains(target)) return
      toast.dismiss(toastId)
    }

    // Próximo tick: evita fechar no mesmo gesto que abriu o toast.
    const timer = window.setTimeout(() => {
      document.addEventListener('pointerdown', fecharSeCliqueFora, true)
    }, 0)

    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('pointerdown', fecharSeCliqueFora, true)
    }
  }, [toastId])

  return (
    <div
      ref={rootRef}
      className="pointer-events-auto relative flex rounded-lg border border-amber-300 bg-white px-3 py-2 shadow-lg"
    >
      <span className="mr-2 shrink-0 self-start pt-0.5" aria-hidden>
        ⚠️
      </span>
      <div className="relative flex min-w-[16rem] max-w-[22rem] flex-col gap-2 pr-5 text-left text-sm text-gray-800">
        <button
          type="button"
          onClick={() => toast.dismiss(toastId)}
          aria-label="Fechar aviso"
          className="absolute -right-1 -top-1 rounded p-0.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <MdClose className="h-4 w-4" aria-hidden />
        </button>
        <p className="leading-snug">
          Ainda falta vincular o WhatsApp para avisar seus clientes sobre os
          pedidos. Podemos fazer isso agora?
        </p>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={avisarEm5Dias}
            onChange={e => {
              const checked = e.target.checked
              setAvisarEm5Dias(checked)
              if (checked) gravarSnooze5Dias(empresaId)
              else limparSnooze(empresaId)
            }}
            className="h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span>Avise novamente em 5 dias</span>
        </label>
        <button
          type="button"
          onClick={() => {
            onConfigurar()
            toast.dismiss(toastId)
          }}
          className="self-start rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-alternate"
        >
          Configurar
        </button>
      </div>
    </div>
  )
}

export function exibirToastAvisoCanalWhatsAppKanban(params: {
  empresaId: string
  onConfigurar: () => void
  durationMs?: number
}): string {
  return toast.custom(
    t => (
      <AvisoCanalWhatsAppKanbanToast
        toastId={t.id}
        empresaId={params.empresaId}
        onConfigurar={params.onConfigurar}
      />
    ),
    {
      id: TOAST_AVISO_WHATSAPP_KANBAN_ID,
      duration: params.durationMs ?? 12_000,
    }
  )
}
