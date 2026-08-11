'use client'

import { useState } from 'react'
import { CalendarClock, Info } from 'lucide-react'
import { MdDeliveryDining, MdDirectionsWalk } from 'react-icons/md'
import { DeliveryLojaInformacoesModal } from './DeliveryLojaInformacoesModal'
import type { DeliveryLojaInformacoesData } from '../types/deliveryLojaInformacoes'

/** Placeholders até existir horário/tempo estimado no backend. */
const TEMPO_RETIRADA_PLACEHOLDER = '19 min'
const TEMPO_ENTREGA_PLACEHOLDER = '40 min'
const HORARIO_ABERTO_PLACEHOLDER = 'das 09:00 às 23:30'
const HORARIO_FECHADO_PLACEHOLDER = 'abre às 09:00'

type DeliveryStatusHorarioProps = {
  disponivel: boolean
  /** Mantido por compatibilidade; subtítulo ainda usa placeholders. */
  horarioTexto?: string
  interactive?: boolean
  /** Dados do modal de informações da loja (botão "i"). */
  lojaInformacoes?: DeliveryLojaInformacoesData | null
  onInformacoesClick?: () => void
}

function StatusSeparator() {
  return (
    <span className="shrink-0 text-gray-300" aria-hidden>
      ·
    </span>
  )
}

export function DeliveryStatusHorario({
  disponivel,
  interactive = false,
  lojaInformacoes = null,
  onInformacoesClick,
}: DeliveryStatusHorarioProps) {
  const [informacoesAberto, setInformacoesAberto] = useState(false)
  const horarioLinha = disponivel ? HORARIO_ABERTO_PLACEHOLDER : HORARIO_FECHADO_PLACEHOLDER
  const canOpenInformacoes = Boolean(lojaInformacoes) || Boolean(onInformacoesClick)

  const handleInformacoesClick = () => {
    if (!canOpenInformacoes) return
    if (lojaInformacoes) {
      setInformacoesAberto(true)
      return
    }
    if (interactive) onInformacoesClick?.()
  }

  return (
    <div className="mt-2 px-4">
      <div
        className={`flex items-center gap-1.5 text-xs font-semibold @sm:text-sm ${
          disponivel ? 'text-green-600' : 'text-gray-500'
        }`}
      >
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${
            disponivel ? 'bg-green-500' : 'bg-gray-400'
          }`}
          aria-hidden
        />
        <span>{disponivel ? 'Aberto' : 'Fechado'}</span>
        <span className="font-normal text-gray-500">- {horarioLinha}</span>
      </div>

      <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto text-xs text-gray-500 @sm:gap-2 @sm:text-sm [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <span className="inline-flex shrink-0 items-center gap-1">
          <MdDirectionsWalk className="h-3.5 w-3.5 @sm:h-4 @sm:w-4" aria-hidden />
          <span>{TEMPO_RETIRADA_PLACEHOLDER}</span>
          <span className="sr-only">para retirada</span>
        </span>

        <StatusSeparator />

        <span className="inline-flex shrink-0 items-center gap-1">
          <MdDeliveryDining className="h-3.5 w-3.5 @sm:h-4 @sm:w-4" aria-hidden />
          <span>{TEMPO_ENTREGA_PLACEHOLDER}</span>
          <span className="sr-only">para entrega</span>
        </span>

        <StatusSeparator />

        <span className="inline-flex shrink-0 items-center gap-1">
          <CalendarClock className="h-3.5 w-3.5 @sm:h-4 @sm:w-4" aria-hidden />
          <span>Entrega agendada</span>
        </span>

        <button
          type="button"
          aria-label="Informações da loja"
          disabled={!canOpenInformacoes}
          onClick={handleInformacoesClick}
          className="ml-0.5 flex h-7 w-7 shrink-0 items-center justify-center disabled:cursor-default disabled:opacity-40 @sm:h-8 @sm:w-8"
          style={{ color: 'var(--delivery-primary-dark, #171717)' }}
        >
          <Info className="h-4 w-4 @sm:h-5 @sm:w-5" aria-hidden />
        </button>
      </div>

      {lojaInformacoes ? (
        <DeliveryLojaInformacoesModal
          aberto={informacoesAberto}
          data={lojaInformacoes}
          onClose={() => setInformacoesAberto(false)}
        />
      ) : null}
    </div>
  )
}
