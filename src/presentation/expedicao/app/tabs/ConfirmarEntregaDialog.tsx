'use client'

import { useEffect, useMemo, useState } from 'react'
import { MdCheck } from 'react-icons/md'
import type { PedidoResumoAppEntregador } from '@/src/application/expedicao/app/filtrarPedidosDoEntregador'
import {
  alternarMeioNasLinhasFinalizarApp,
  atualizarValorLinhaFinalizarApp,
  montarLinhasIniciaisFinalizarApp,
  montarOpcoesMeioPagamentoFinalizarApp,
  somaLinhasPagamentoFinalizarApp,
  valorACobrirFinalizarApp,
  type LinhaPagamentoFinalizarApp,
  type MeioPagamentoAppEntregador,
} from '@/src/application/expedicao/app/pagamentoFinalizarEntregaApp'
import { formatarMoedaApp } from '@/src/presentation/expedicao/app/format'

type ConfirmarEntregaDialogProps = {
  pedido: PedidoResumoAppEntregador
  meios: MeioPagamentoAppEntregador[]
  ocupado: boolean
  onVoltar: () => void
  onConfirmar: (linhas: LinhaPagamentoFinalizarApp[]) => void
}

export function ConfirmarEntregaDialog(props: ConfirmarEntregaDialogProps) {
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

  useEffect(() => {
    setLinhas(
      montarLinhasIniciaisFinalizarApp({
        cobrancas: props.pedido.cobrancas ?? [],
        valorFinal: props.pedido.valorFinal,
        faltaPagar: props.pedido.faltaPagar,
      })
    )
  }, [props.pedido.id, props.pedido.cobrancas, props.pedido.faltaPagar, props.pedido.valorFinal])

  const opcoes = useMemo(
    () => montarOpcoesMeioPagamentoFinalizarApp({ meios: props.meios, cobrancas }),
    [cobrancas, props.meios]
  )
  const selecionados = new Set(linhas.map(linha => linha.meioPagamentoId))
  const soma = somaLinhasPagamentoFinalizarApp(linhas)
  const fecha = Math.abs(soma - valorAlvo) < 0.009
  const podeDividir = linhas.length > 1

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-semibold text-zinc-900">Entrega feita?</h2>
        <p className="mt-1 text-sm text-zinc-500">
          #{props.pedido.numeroVenda ?? props.pedido.codigoVenda} · {props.pedido.clienteNome}
        </p>
        <p className="mt-3 text-sm text-zinc-700">
          {props.pedido.faltaPagar > 0
            ? `Fecha com o cliente (${formatarMoedaApp(props.pedido.faltaPagar)}) e finaliza o pedido.`
            : 'Confirme como o cliente pagou e finalize.'}
        </p>

        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Como o cliente pagou?</p>
          <p className="mt-1 text-sm leading-snug text-zinc-600">
            Toque nas formas usadas. Para dividir (PIX + dinheiro), marque as duas e ajuste o valor.
          </p>
          <ul className="mt-3 space-y-2">
            {opcoes.map(opcao => {
              const marcado = selecionados.has(opcao.id)
              const indice = linhas.findIndex(linha => linha.meioPagamentoId === opcao.id)
              const linha = indice >= 0 ? linhas[indice] : null
              return (
                <li key={opcao.id}>
                  <button
                    type="button"
                    onClick={() =>
                      setLinhas(prev =>
                        alternarMeioNasLinhasFinalizarApp({
                          linhas: prev,
                          meioPagamentoId: opcao.id,
                          valorAlvo,
                        })
                      )
                    }
                    className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left ${
                      marcado ? 'border-secondary bg-secondary/5' : 'border-zinc-200 bg-white'
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
                        marcado ? 'bg-secondary text-white' : 'border border-zinc-300 bg-white text-transparent'
                      }`}
                    >
                      <MdCheck className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-zinc-900">{opcao.nome}</span>
                      {opcao.noPedido ? (
                        <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                          No pedido
                        </span>
                      ) : (
                        <span className="text-[11px] text-zinc-400">Toque para somar</span>
                      )}
                    </span>
                    {marcado && linha && !podeDividir ? (
                      <span className="text-sm font-bold text-zinc-900">{formatarMoedaApp(linha.valor)}</span>
                    ) : null}
                  </button>
                  {marcado && linha && podeDividir ? (
                    <label className="mt-1.5 flex items-center justify-between gap-3 rounded-2xl bg-zinc-50 px-3 py-2">
                      <span className="text-xs font-medium text-zinc-500">Valor neste meio</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="0.01"
                        value={linha.valor}
                        onChange={event =>
                          setLinhas(prev =>
                            atualizarValorLinhaFinalizarApp({
                              linhas: prev,
                              indice,
                              valor: Number(event.target.value),
                              valorAlvo,
                            })
                          )
                        }
                        className="w-28 rounded-xl border border-zinc-200 bg-white px-2 py-1.5 text-right text-sm font-semibold text-zinc-900"
                      />
                    </label>
                  ) : null}
                </li>
              )
            })}
          </ul>
          {opcoes.length <= 1 ? (
            <p className="mt-2 text-xs text-zinc-500">
              Se outras formas não aparecerem, puxe a lista de novo ao abrir a entrega.
            </p>
          ) : null}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 text-sm">
          <span className="font-medium text-zinc-600">
            {linhas.map(linha => opcoes.find(opcao => opcao.id === linha.meioPagamentoId)?.nome ?? 'Pagamento').join(' + ')}
          </span>
          <span className="font-semibold text-zinc-900">{formatarMoedaApp(soma)}</span>
        </div>
        {!fecha ? (
          <p className="mt-2 text-xs text-amber-800">A soma precisa fechar {formatarMoedaApp(valorAlvo)}.</p>
        ) : null}

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={props.onVoltar}
            disabled={props.ocupado}
            className="h-12 rounded-2xl bg-zinc-100 text-sm font-semibold text-zinc-800"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={() => props.onConfirmar(linhas)}
            disabled={props.ocupado || !fecha || linhas.length === 0}
            className="h-12 rounded-2xl bg-secondary text-sm font-semibold text-white disabled:opacity-50"
          >
            {props.ocupado ? 'Finalizando…' : 'Finalizar'}
          </button>
        </div>
      </div>
    </div>
  )
}
