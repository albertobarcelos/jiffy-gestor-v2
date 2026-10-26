'use client'

import { useEffect, useState } from 'react'
import type { PedidoResumoAppEntregador } from '@/src/presentation/expedicao/app/api/expedicaoAppApi'
import type { MeioPagamentoAppEntregador } from '@/src/application/expedicao/app/pagamentoFinalizarEntregaApp'
import {
  idMeioPagamentoPadraoFinalizarApp,
  montarOpcoesMeioPagamentoFinalizarApp,
} from '@/src/application/expedicao/app/pagamentoFinalizarEntregaApp'
import { formatarMoedaApp } from '@/src/presentation/expedicao/app/format'
import { AppSpinner } from '@/src/presentation/expedicao/app/shell/AppSpinner'

export function ConfirmarEntregaDialog(props: {
  pedido: PedidoResumoAppEntregador
  meios: MeioPagamentoAppEntregador[]
  ocupado: boolean
  onCancelar: () => void
  onConfirmar: (meioPagamentoId: string | null) => void
}) {
  const cobrancas = props.pedido.cobrancas ?? []
  const padrao = idMeioPagamentoPadraoFinalizarApp(cobrancas)
  const [selecionadoId, setSelecionadoId] = useState<string | null>(padrao)
  const opcoes = montarOpcoesMeioPagamentoFinalizarApp({
    meios: props.meios,
    cobrancas,
  })
  const cobrar = props.pedido.faltaPagar > 0
  const rotuloAtual =
    opcoes.find(opcao => opcao.id === (selecionadoId ?? padrao))?.nome ||
    props.pedido.formaPagamento ||
    (cobrar ? 'Na entrega' : 'Pago')

  useEffect(() => {
    setSelecionadoId(idMeioPagamentoPadraoFinalizarApp(props.pedido.cobrancas ?? []))
  }, [props.pedido.id])

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-8 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmar-entrega-titulo"
        className="flex max-h-[min(88dvh,40rem)] w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-white text-zinc-900 shadow-lg"
      >
        <div
          data-expedicao-scroll
          className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-5"
        >
          <h2 id="confirmar-entrega-titulo" className="text-lg font-semibold">
            Entrega feita?
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            #{props.pedido.numeroVenda ?? props.pedido.codigoVenda} · {props.pedido.clienteNome}
          </p>
          <p className="mt-3 text-sm text-zinc-700">
            {cobrar
              ? `Fecha com o cliente (${formatarMoedaApp(props.pedido.faltaPagar)}) e finaliza o pedido.`
              : 'Finaliza este pedido. Depois não dá para desfazer.'}
          </p>

          <p className="mt-4 text-[11px] font-bold uppercase tracking-wide text-zinc-400">
            Como o cliente pagou?
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            Já vem <span className="font-semibold text-zinc-700">{rotuloAtual}</span> no pedido. Troque só se
            for outro.
          </p>

          {opcoes.length > 0 ? (
            <ul className="mt-3 grid grid-cols-2 gap-2">
              {opcoes.map(opcao => {
                const ativo = (selecionadoId ?? padrao) === opcao.id
                return (
                  <li key={opcao.id}>
                    <button
                      type="button"
                      disabled={props.ocupado}
                      onClick={() => setSelecionadoId(opcao.id)}
                      className={`flex h-[4.25rem] w-full flex-col items-start justify-center rounded-xl px-3 text-left disabled:opacity-50 ${
                        ativo
                          ? 'bg-secondary text-white'
                          : 'bg-zinc-100 text-zinc-800'
                      }`}
                    >
                      <span className="line-clamp-2 text-sm font-semibold leading-tight">{opcao.nome}</span>
                      {opcao.noPedido ? (
                        <span className={`mt-1 text-[10px] font-bold uppercase tracking-wide ${ativo ? 'text-white/80' : 'text-zinc-400'}`}>
                          No pedido
                        </span>
                      ) : null}
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="mt-3 rounded-xl bg-zinc-50 px-3 py-2.5 text-sm font-semibold text-zinc-800">
              {rotuloAtual}
            </p>
          )}
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-3 border-t border-zinc-100 p-5">
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
            onClick={() => props.onConfirmar(selecionadoId)}
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
