'use client'

import type { ReactNode } from 'react'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import type { CanalDeliveryMeioPagamento } from '@/src/application/meios-pagamentos/toggleCanalDeliveryMeioPagamento'

interface MeioPagamentoCanaisDeliverySwitchesProps {
  nome: string
  entrega: boolean
  retirada: boolean
  updatingEntrega?: boolean
  updatingRetirada?: boolean
  size?: 'xs' | 'sm'
  onToggle: (channel: CanalDeliveryMeioPagamento, next: boolean) => void
}

function colunaSwitch(children: ReactNode) {
  return (
    <div
      className="flex flex-[1] justify-center md:flex-[2]"
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
      onTouchStart={e => e.stopPropagation()}
    >
      {children}
    </div>
  )
}

export function MeioPagamentoCanaisDeliverySwitches({
  nome,
  entrega,
  retirada,
  updatingEntrega = false,
  updatingRetirada = false,
  size = 'sm',
  onToggle,
}: MeioPagamentoCanaisDeliverySwitchesProps) {
  return (
    <>
      {colunaSwitch(
        <JiffyIconSwitch
          checked={entrega}
          onChange={e => {
            e.stopPropagation()
            onToggle('ativoEntregaDelivery', e.target.checked)
          }}
          disabled={updatingEntrega}
          size={size}
          className="justify-center gap-0 px-0 py-0"
          inputProps={{
            'aria-label': `Entrega — ${nome}`,
            title: entrega ? 'Disponível para entrega' : 'Não disponível para entrega',
          }}
        />
      )}
      {colunaSwitch(
        <JiffyIconSwitch
          checked={retirada}
          onChange={e => {
            e.stopPropagation()
            onToggle('ativoRetiradaDelivery', e.target.checked)
          }}
          disabled={updatingRetirada}
          size={size}
          className="justify-center gap-0 px-0 py-0"
          inputProps={{
            'aria-label': `Retirada — ${nome}`,
            title: retirada ? 'Disponível para retirada' : 'Não disponível para retirada',
          }}
        />
      )}
    </>
  )
}
