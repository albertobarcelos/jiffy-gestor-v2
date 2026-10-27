'use client'

import Image from 'next/image'
import { MdArrowBack, MdWhatsapp } from 'react-icons/md'
import type { PedidoResumoAppEntregador } from '@/src/presentation/expedicao/app/api/expedicaoAppApi'
import { formatarMoedaApp } from '@/src/presentation/expedicao/app/format'
import { AppSpinner } from '@/src/presentation/expedicao/app/shell/AppSpinner'
import { hrefWazeNavegacaoApp } from '@/src/application/expedicao/app/navegacaoEntregadorApp'
import { hrefWhatsAppApp } from '@/src/application/expedicao/app/telefoneEntregadorApp'
import { TrocoLevarAppAviso } from '@/src/presentation/expedicao/app/tabs/TrocoLevarAppAviso'

export function PedidoDetalheScreen(props: {
  pedido: PedidoResumoAppEntregador
  itens: Array<{ id: string; nome: string; quantidade: number }>
  carregandoItens: boolean
  confirmando: boolean
  onVoltar: () => void
  onPedirConfirmacao: () => void
}) {
  const waze = hrefWazeNavegacaoApp({
    endereco: props.pedido.enderecoNavegacao,
    latitude: props.pedido.latitude,
    longitude: props.pedido.longitude,
  })
  const whats = hrefWhatsAppApp(props.pedido.telefone)
  const numero = props.pedido.numeroVenda ?? props.pedido.codigoVenda
  const codigoLetras =
    props.pedido.numeroVenda && props.pedido.codigoVenda ? props.pedido.codigoVenda : null

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-zinc-50">
      <header className="flex shrink-0 items-center gap-3 bg-white px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] shadow-sm ring-1 ring-black/[0.03]">
        <button type="button" onClick={props.onVoltar} className="rounded-full p-2" aria-label="Voltar">
          <MdArrowBack className="h-6 w-6" />
        </button>
        <div className="min-w-0">
          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-xl font-extrabold tracking-tight text-zinc-900">#{numero}</span>
            {codigoLetras ? (
              <span className="text-sm font-semibold tracking-wide text-zinc-600">{codigoLetras}</span>
            ) : null}
          </p>
          <h1 className="mt-0.5 truncate text-lg font-semibold text-zinc-900">{props.pedido.clienteNome}</h1>
        </div>
      </header>

      <div
        data-expedicao-scroll
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-y-contain px-4 py-4"
      >
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Entrega</p>
          <p className="mt-2 text-sm font-semibold leading-5 text-zinc-900">
            {props.pedido.enderecoNavegacao ||
              props.pedido.endereco ||
              props.pedido.bairro ||
              'Endereço não informado'}
          </p>
          <p className="mt-1 text-xs font-semibold text-zinc-400">
            {props.pedido.etapa === 'EM_ROTA' ? 'Em rota' : 'Pronto'}
          </p>
          {waze || whats ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {waze ? (
                <a
                  href={waze}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Abrir no Waze"
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-[#33CCFF]"
                >
                  <Image
                    src="/images/expedicao/waze_logo.webp"
                    alt=""
                    width={120}
                    height={40}
                    className="h-9 w-auto"
                  />
                </a>
              ) : null}
              {whats ? (
                <a
                  href={whats}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-zinc-100 text-sm font-semibold text-zinc-800"
                >
                  <MdWhatsapp className="h-4 w-4" aria-hidden />
                  WhatsApp
                </a>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-400">Sem rota nem telefone neste pedido.</p>
          )}
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Pagamento</p>
          <p className="mt-2 text-lg font-extrabold text-zinc-900">
            {props.pedido.formaPagamento || (props.pedido.faltaPagar > 0 ? 'Na entrega' : 'Pago')}
          </p>
          <p className="mt-1 text-sm font-semibold text-zinc-500">
            Total {formatarMoedaApp(props.pedido.valorFinal)}
          </p>
          {props.pedido.faltaPagar > 0 ? (
            <p className="mt-1 text-sm font-semibold text-amber-600">
              Cobrar {formatarMoedaApp(props.pedido.faltaPagar)}
            </p>
          ) : (
            <p className="mt-1 text-sm text-zinc-500">Pago</p>
          )}
          <TrocoLevarAppAviso valor={props.pedido.trocoLevar} className="mt-3" />
        </section>

        {props.pedido.observacao ? (
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Observação</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">{props.pedido.observacao}</p>
          </section>
        ) : null}

        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Itens</p>
          {props.carregandoItens ? (
            <div className="flex justify-center py-6">
              <AppSpinner className="h-6 w-6" />
            </div>
          ) : props.itens.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500">Sem itens neste pedido.</p>
          ) : (
            <ul className="mt-2 divide-y divide-zinc-100">
              {props.itens.map(item => (
                <li key={item.id} className="flex items-start justify-between gap-3 py-2">
                  <span className="text-sm font-medium text-zinc-900">{item.nome}</span>
                  <span className="shrink-0 text-sm text-zinc-500">{item.quantidade}x</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {props.pedido.etapa === 'EM_ROTA' ? (
        <footer className="shrink-0 border-t border-black/[0.06] bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <button
            type="button"
            disabled={props.confirmando}
            onClick={props.onPedirConfirmacao}
            className="h-12 w-full rounded-xl bg-secondary text-sm font-semibold text-white disabled:opacity-60"
          >
            Entrega feita
          </button>
        </footer>
      ) : null}
    </div>
  )
}
