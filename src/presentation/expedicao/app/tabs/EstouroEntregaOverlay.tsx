'use client'

import type { EstouroFinalizarEntrega } from '@/src/application/expedicao/app/placarTurnoEntregador'
import { formatarMoedaApp } from '@/src/presentation/expedicao/app/format'

export function EstouroEntregaOverlay(props: { estouro: EstouroFinalizarEntrega }) {
  const { estouro } = props
  return (
    <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center px-8">
      <div className="expedicao-estouro rounded-3xl bg-zinc-900 px-8 py-7 text-center shadow-2xl">
        {estouro.taxa > 0 ? (
          <p className="text-[34px] font-extrabold tracking-tight text-emerald-400">
            + {formatarMoedaApp(estouro.taxa)}
          </p>
        ) : null}
        <p className={`text-lg font-semibold text-white ${estouro.taxa > 0 ? 'mt-1' : ''}`}>
          {estouro.ordinal} de hoje
        </p>
        <p className="mt-2 text-sm font-semibold text-zinc-400">
          {estouro.novoRecorde ? 'Novo recorde!' : `Recorde · ${estouro.recorde}`}
        </p>
      </div>
    </div>
  )
}
