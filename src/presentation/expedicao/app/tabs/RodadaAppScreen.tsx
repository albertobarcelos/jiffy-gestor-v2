'use client'

import { MdQrCodeScanner } from 'react-icons/md'
import type { PedidoLeituraExpedicao } from '@/src/application/expedicao/avaliarPedidoParaRodada'
import { formatarMoedaApp } from '@/src/presentation/expedicao/app/format'

type RodadaAppScreenProps = {
  pedidos: PedidoLeituraExpedicao[]
  avisos: Array<{ codigo: string; motivo: string }>
  ocupado: boolean
  sincronizandoIds?: string[]
  onPegar: () => void
  onConferir: () => void
  onExpedir: () => void
  onCancelar: () => void
}

function rotuloEtapa(etapa: string | null): string {
  const valor = String(etapa ?? '').toUpperCase()
  if (valor === 'EM_ROTA') return 'Em rota'
  if (valor === 'PRONTO') return 'Pronto'
  return valor || 'Pronto'
}

function resumoItens(pedido: PedidoLeituraExpedicao): string | null {
  if (pedido.itens.length === 0) return null
  const quantidade = pedido.itens.reduce((soma, item) => soma + item.quantidade, 0)
  const nomes = pedido.itens
    .slice(0, 2)
    .map(item => item.nome)
    .join(', ')
  const extra = pedido.itens.length > 2 ? '…' : ''
  return `${quantidade} ${quantidade === 1 ? 'item' : 'itens'} · ${nomes}${extra}`
}

export function RodadaAppScreen(props: RodadaAppScreenProps) {
  const sincronizando = new Set(props.sincronizandoIds ?? [])
  const bloqueado = props.ocupado || sincronizando.size > 0
  return (
    <div className="relative flex h-full min-h-0 flex-col bg-zinc-100">
      <header className="flex shrink-0 items-center justify-between gap-3 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Na porta</p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Rodada</h1>
        </div>
        <button
          type="button"
          onClick={props.onCancelar}
          className="rounded-full px-3 py-2 text-sm font-semibold text-zinc-500"
        >
          Voltar
        </button>
      </header>

      <ul className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-28 pt-1">
        {props.avisos.map(aviso => (
          <li
            key={`${aviso.codigo}-${aviso.motivo}`}
            className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {aviso.codigo}: {aviso.motivo}
          </li>
        ))}
        {props.pedidos.map(pedido => {
          const itens = resumoItens(pedido)
          const sync = sincronizando.has(pedido.id)
          return (
            <li key={pedido.id} className="rounded-3xl bg-white px-4 py-4 shadow-sm ring-1 ring-black/[0.04]">
              <div className="flex items-start justify-between gap-3">
                <p className="text-3xl font-black leading-none tracking-tight text-zinc-900">
                  #{pedido.numeroVenda ?? pedido.codigoVenda}
                </p>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                    sync
                      ? 'bg-amber-50 text-amber-900'
                      : 'bg-emerald-50 text-emerald-800'
                  }`}
                >
                  {sync ? 'Sincronizando…' : rotuloEtapa(pedido.etapa)}
                </span>
              </div>
              <p className="mt-3 text-lg font-bold uppercase leading-tight text-zinc-900">{pedido.clienteNome}</p>
              <p className="mt-1 text-sm font-medium leading-snug text-zinc-600">
                {pedido.endereco || pedido.bairro || 'Sem endereço'}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-zinc-50 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Pagamento</p>
                  <p className="mt-0.5 truncate text-sm font-bold text-zinc-900">
                    {pedido.formaPagamento || '—'}
                  </p>
                </div>
                <div className="rounded-2xl bg-amber-50 px-3 py-2 text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800/80">
                    {pedido.faltaPagar > 0 ? 'A cobrar' : 'Total'}
                  </p>
                  <p className="mt-0.5 text-sm font-black text-amber-950">
                    {formatarMoedaApp(pedido.faltaPagar > 0 ? pedido.faltaPagar : pedido.valorFinal)}
                  </p>
                </div>
              </div>
              {itens ? <p className="mt-3 text-xs font-medium text-zinc-500">{itens}</p> : null}
            </li>
          )
        })}
      </ul>

      <button
        type="button"
        onClick={props.onPegar}
        disabled={props.ocupado}
        aria-label="Pegar pedido"
        className="absolute bottom-[5.75rem] right-4 z-20 flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-white shadow-[0_10px_28px_rgba(91,33,182,0.4)] transition-transform active:scale-95 disabled:pointer-events-none disabled:opacity-50"
      >
        <MdQrCodeScanner className="h-8 w-8" aria-hidden />
      </button>

      <footer className="grid shrink-0 grid-cols-[1.35fr_1fr] gap-2 border-t border-black/[0.04] bg-zinc-100 px-4 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-3">
        <button
          type="button"
          onClick={props.onConferir}
          disabled={bloqueado || props.pedidos.length === 0}
          className="h-14 rounded-2xl bg-secondary text-base font-semibold text-white shadow-sm disabled:opacity-50"
        >
          Conferir
        </button>
        <button
          type="button"
          onClick={props.onExpedir}
          disabled={bloqueado || props.pedidos.length === 0}
          className="h-14 rounded-2xl bg-zinc-900 text-sm font-semibold text-white disabled:opacity-50"
        >
          {props.ocupado ? 'Saindo…' : 'Para Entrega'}
        </button>
      </footer>
    </div>
  )
}
