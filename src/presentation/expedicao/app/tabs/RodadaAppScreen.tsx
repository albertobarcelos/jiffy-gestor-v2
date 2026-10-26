'use client'

import { MdQrCodeScanner } from 'react-icons/md'
import type { PedidoLeituraExpedicao } from '@/src/application/expedicao/avaliarPedidoParaRodada'
import { AppSpinner } from '@/src/presentation/expedicao/app/shell/AppSpinner'

export function RodadaAppScreen(props: {
  pedidos: PedidoLeituraExpedicao[]
  avisos: Array<{ codigo: string; motivo: string }>
  ocupado: boolean
  onPegarMais: () => void
  onConferir: () => void
  onExpedir: () => void
  onCancelar: () => void
}) {
  const podeExpedir = props.pedidos.length > 0 && !props.ocupado

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Na porta</p>
          <h1 className="text-[28px] font-semibold tracking-tight text-zinc-900">Rodada</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={props.onPegarMais}
            disabled={props.ocupado}
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-secondary px-3.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            <MdQrCodeScanner className="h-5 w-5" aria-hidden />
            Pegar
          </button>
          <button
            type="button"
            onClick={props.onCancelar}
            disabled={props.ocupado}
            className="text-sm font-semibold text-zinc-500 disabled:opacity-40"
          >
            Voltar
          </button>
        </div>
      </header>

      <div
        data-expedicao-scroll
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-4"
      >
        {props.avisos.length > 0 ? (
          <ul className="mb-3 space-y-1">
            {props.avisos.map(aviso => (
              <li key={`${aviso.codigo}-${aviso.motivo}`} className="text-sm font-medium text-amber-700">
                {aviso.codigo}: {aviso.motivo}
              </li>
            ))}
          </ul>
        ) : null}

        {props.pedidos.length === 0 ? (
          <div className="pt-16 text-center">
            <p className="text-lg font-semibold text-zinc-900">Aguardando leitura</p>
            <p className="mt-1 text-sm text-zinc-500">Aponte para o QR da comanda para lançar o pedido.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {props.pedidos.map(pedido => (
              <li key={pedido.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  #{pedido.numeroVenda ?? pedido.codigoVenda}
                </p>
                <p className="mt-0.5 text-base font-semibold text-zinc-900">{pedido.clienteNome}</p>
                {pedido.bairro ? <p className="mt-1 text-sm text-zinc-500">{pedido.bairro}</p> : null}
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Pronto</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer className="grid grid-cols-2 gap-3 border-t border-black/[0.06] bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <button
          type="button"
          disabled={!podeExpedir}
          onClick={props.onConferir}
          className="h-12 rounded-xl bg-zinc-100 text-sm font-semibold text-zinc-800 disabled:opacity-40"
        >
          Conferir
        </button>
        <button
          type="button"
          disabled={!podeExpedir}
          onClick={props.onExpedir}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-secondary text-sm font-semibold text-white disabled:opacity-40"
        >
          {props.ocupado ? <AppSpinner tom="branco" /> : null}
          {props.ocupado ? 'Em rota…' : 'Em rota'}
        </button>
      </footer>
    </div>
  )
}
