'use client'

import { useEffect, useMemo, useState } from 'react'
import { MdExpandLess, MdExpandMore } from 'react-icons/md'
import type { PedidoResumoAppEntregador } from '@/src/presentation/expedicao/app/api/expedicaoAppApi'
import type {
  LinhaPagamentoFinalizarApp,
  MeioPagamentoAppEntregador,
} from '@/src/application/expedicao/app/pagamentoFinalizarEntregaApp'
import {
  alternarMeioNasLinhasFinalizarApp,
  atualizarValorLinhaFinalizarApp,
  montarLinhasIniciaisFinalizarApp,
  montarOpcoesMeioPagamentoFinalizarApp,
  somaLinhasPagamentoFinalizarApp,
  valorACobrirFinalizarApp,
} from '@/src/application/expedicao/app/pagamentoFinalizarEntregaApp'
import { formatarMoedaApp } from '@/src/presentation/expedicao/app/format'
import { AppSpinner } from '@/src/presentation/expedicao/app/shell/AppSpinner'

export function ConfirmarEntregaDialog(props: {
  pedido: PedidoResumoAppEntregador
  meios: MeioPagamentoAppEntregador[]
  ocupado: boolean
  onCancelar: () => void
  onConfirmar: (linhas: LinhaPagamentoFinalizarApp[]) => void
}) {
  const cobrancas = props.pedido.cobrancas ?? []
  const valorAlvo = valorACobrirFinalizarApp({
    cobrancas,
    valorFinal: props.pedido.valorFinal,
    faltaPagar: props.pedido.faltaPagar,
  })
  const [linhas, setLinhas] = useState<LinhaPagamentoFinalizarApp[]>(() =>
    montarLinhasIniciaisFinalizarApp({
      cobrancas,
      valorFinal: props.pedido.valorFinal,
      faltaPagar: props.pedido.faltaPagar,
    })
  )
  const [aberto, setAberto] = useState(false)
  const opcoes = montarOpcoesMeioPagamentoFinalizarApp({
    meios: props.meios,
    cobrancas,
  })
  const cobrar = props.pedido.faltaPagar > 0
  const idsEscolhidos = useMemo(
    () => new Set(linhas.map(linha => linha.meioPagamentoId)),
    [linhas]
  )
  const rotuloAtual =
    linhas
      .map(linha => opcoes.find(opcao => opcao.id === linha.meioPagamentoId)?.nome)
      .filter(Boolean)
      .join(' + ') ||
    props.pedido.formaPagamento ||
    (cobrar ? 'Toque para escolher' : 'Pago')
  const soma = somaLinhasPagamentoFinalizarApp(linhas)
  const fechaCerto = linhas.length > 0 && Math.abs(soma - valorAlvo) < 0.009
  const mostrarValores = linhas.length > 1 || valorAlvo > 0

  useEffect(() => {
    setLinhas(
      montarLinhasIniciaisFinalizarApp({
        cobrancas: props.pedido.cobrancas ?? [],
        valorFinal: props.pedido.valorFinal,
        faltaPagar: props.pedido.faltaPagar,
      })
    )
    setAberto(false)
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
          <button
            type="button"
            disabled={props.ocupado || opcoes.length === 0}
            aria-expanded={aberto}
            onClick={() => setAberto(prev => !prev)}
            className="mt-2 flex w-full items-center justify-between gap-3 rounded-xl bg-zinc-100 px-4 py-3 text-left disabled:opacity-50"
          >
            <span>
              <span className="block text-base font-semibold text-zinc-900">{rotuloAtual}</span>
              <span className="mt-0.5 block text-xs font-medium text-zinc-500">
                {opcoes.length === 0
                  ? 'Sem formas para trocar agora'
                  : aberto
                    ? 'Toque de novo para fechar'
                    : 'Toque para trocar ou somar formas'}
              </span>
            </span>
            {aberto ? (
              <MdExpandLess className="h-6 w-6 shrink-0 text-zinc-500" aria-hidden />
            ) : (
              <MdExpandMore className="h-6 w-6 shrink-0 text-zinc-500" aria-hidden />
            )}
          </button>

          {aberto && opcoes.length > 0 ? (
            <ul className="mt-2 overflow-hidden rounded-xl ring-1 ring-zinc-200">
              {opcoes.map(opcao => {
                const marcado = idsEscolhidos.has(opcao.id)
                return (
                  <li key={opcao.id} className="border-b border-zinc-100 last:border-b-0">
                    <button
                      type="button"
                      disabled={props.ocupado}
                      onClick={() =>
                        setLinhas(atual =>
                          alternarMeioNasLinhasFinalizarApp({
                            linhas: atual,
                            meioPagamentoId: opcao.id,
                            valorAlvo,
                          })
                        )
                      }
                      className="flex w-full items-center gap-3 px-4 py-3 text-left disabled:opacity-50"
                    >
                      <span
                        aria-hidden
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-sm font-bold ${
                          marcado ? 'bg-secondary text-white' : 'bg-zinc-200 text-zinc-500'
                        }`}
                      >
                        {marcado ? '✓' : ''}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-zinc-900">{opcao.nome}</span>
                        {opcao.noPedido ? (
                          <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                            No pedido
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : null}

          {mostrarValores && linhas.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {linhas.map((linha, indice) => {
                const nome =
                  opcoes.find(opcao => opcao.id === linha.meioPagamentoId)?.nome || 'Pagamento'
                return (
                  <li key={`${linha.meioPagamentoId}-${indice}`} className="flex items-center gap-3">
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-800">
                      {nome}
                    </span>
                    {linhas.length > 1 ? (
                      <label className="flex items-center gap-1">
                        <span className="text-xs font-medium text-zinc-400">R$</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          disabled={props.ocupado}
                          key={`${linha.meioPagamentoId}-${linha.valor}`}
                          defaultValue={linha.valor.toFixed(2).replace('.', ',')}
                          onBlur={event => {
                            const bruto = event.target.value.replace(/\s/g, '').replace(/\./g, '').replace(',', '.')
                            const valor = Number(bruto)
                            setLinhas(atual =>
                              atualizarValorLinhaFinalizarApp({
                                linhas: atual,
                                indice,
                                valor: Number.isFinite(valor) ? valor : 0,
                                valorAlvo,
                              })
                            )
                          }}
                          className="h-10 w-24 rounded-xl bg-zinc-100 px-3 text-right text-sm font-semibold text-zinc-900 outline-none ring-1 ring-transparent focus:ring-secondary disabled:opacity-50"
                        />
                      </label>
                    ) : (
                      <span className="text-sm font-semibold text-zinc-900">
                        {formatarMoedaApp(linha.valor)}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          ) : null}

          {linhas.length > 1 && !fechaCerto ? (
            <p className="mt-2 text-xs font-semibold text-amber-700">
              A soma precisa fechar {formatarMoedaApp(valorAlvo)}.
            </p>
          ) : null}
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
            disabled={props.ocupado || !fechaCerto}
            onClick={() => props.onConfirmar(linhas)}
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
