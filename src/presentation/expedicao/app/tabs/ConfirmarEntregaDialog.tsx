'use client'

import type { PedidoResumoAppEntregador } from '@/src/presentation/expedicao/app/api/expedicaoAppApi'
import { formatarMoedaApp } from '@/src/presentation/expedicao/app/format'
import { AppSpinner } from '@/src/presentation/expedicao/app/shell/AppSpinner'

export function ConfirmarEntregaDialog(props: {
  pedido: PedidoResumoAppEntregador
  ocupado: boolean
  onCancelar: () => void
  onConfirmar: () => void
}) {
  const cobrar = props.pedido.faltaPagar > 0
  const troco = props.pedido.trocoParaLevar > 0 ? props.pedido.trocoParaLevar : 0
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-8 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmar-entrega-titulo"
        className="w-full max-w-sm rounded-2xl bg-white p-5 text-zinc-900 shadow-lg"
      >
        <h2 id="confirmar-entrega-titulo" className="text-lg font-semibold">
          Entrega feita?
        </h2>
        <p className="mt-2 text-sm text-zinc-500">
          #{props.pedido.numeroVenda ?? props.pedido.codigoVenda} · {props.pedido.clienteNome}
        </p>
        <p className="mt-3 text-sm text-zinc-700">
          {cobrar && troco > 0
            ? `Cobra ${formatarMoedaApp(props.pedido.faltaPagar)} e leva ${formatarMoedaApp(troco)} de troco. Depois finaliza.`
            : cobrar
              ? `Fecha com o cliente (${formatarMoedaApp(props.pedido.faltaPagar)}) e finaliza o pedido.`
              : 'Finaliza este pedido. Depois não dá para desfazer.'}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={props.ocupado}
            onClick={props.onCancelar}
            className="h-11 rounded-xl bg-zinc-100 text-sm font-semibold text-zinc-800 disabled:opacity-50"
          >
            Voltar
          </button>
          <button
            type="button"
            disabled={props.ocupado}
            onClick={props.onConfirmar}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-secondary text-sm font-semibold text-white disabled:opacity-60"
          >
            {props.ocupado ? <AppSpinner tom="branco" /> : null}
            {props.ocupado ? 'Finalizando…' : 'Finalizar'}
          </button>
        </div>
      </div>
    </div>
  )
}
