'use client'

import { Info } from 'lucide-react'

type DeliveryStatusHorarioProps = {
  disponivel: boolean
  /** Linha principal (ex.: "Aberto, faça seu pedido!"). */
  statusMensagem: string
  /** Linha do horário (ex.: "até as 22:45"); o ícone de info fica nesta linha. */
  statusDetalheHorario?: string | null
  /** `topnav` = embutido no header escuro; `standalone` = bloco abaixo da capa. */
  variant?: 'topnav' | 'standalone'
  interactive?: boolean
  onInformacoesClick?: () => void
}

export function DeliveryStatusHorario({
  disponivel,
  statusMensagem,
  statusDetalheHorario = null,
  variant = 'standalone',
  interactive = false,
  onInformacoesClick,
}: DeliveryStatusHorarioProps) {
  const isTopnav = variant === 'topnav'
  const mensagem =
    statusMensagem.trim() ||
    (disponivel ? 'Aberto, faça seu pedido!' : 'Estamos fechado!')
  const detalhe = statusDetalheHorario?.trim() || null

  const statusColor = isTopnav
    ? disponivel
      ? 'text-emerald-300'
      : 'text-red-400'
    : disponivel
      ? 'text-green-600'
      : 'text-red-600'

  const detalheColor = isTopnav ? 'text-white/70' : 'text-gray-500'

  const infoButton = (
    <button
      type="button"
      aria-label="Informações da loja"
      disabled={!interactive}
      onClick={() => interactive && onInformacoesClick?.()}
      className={`flex shrink-0 items-center justify-center disabled:cursor-default ${
        isTopnav ? 'h-4 w-4' : 'h-7 w-7 @sm:h-8 @sm:w-8'
      }`}
      style={{
        color: isTopnav
          ? 'var(--delivery-btn-text, #ffffff)'
          : 'var(--delivery-primary-dark, #171717)',
      }}
    >
      <Info className={isTopnav ? 'h-3 w-3' : 'h-4 w-4 @sm:h-5 @sm:w-5'} aria-hidden />
    </button>
  )

  return (
    <div className={isTopnav ? 'min-w-0' : 'mt-2 px-4'}>
      <div
        className={`flex min-w-0 items-center gap-1 text-[11px] font-semibold leading-tight @sm:text-xs ${statusColor}`}
      >
        <span className="min-w-0 flex-1">{mensagem}</span>
        {!detalhe ? infoButton : null}
      </div>

      {detalhe ? (
        <div
          className={`flex items-center gap-0.5 text-[10px] font-medium leading-tight @sm:text-[11px] ${detalheColor}`}
        >
          <span className="min-w-0">{detalhe}</span>
          {infoButton}
        </div>
      ) : null}
    </div>
  )
}
