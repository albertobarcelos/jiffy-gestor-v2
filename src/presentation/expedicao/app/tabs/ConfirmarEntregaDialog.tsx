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
  valorJaPagoFinalizarApp,
  type LinhaPagamentoFinalizarApp,
  type MeioPagamentoAppEntregador,
} from '@/src/application/expedicao/app/pagamentoFinalizarEntregaApp'
import { formatarMoedaApp } from '@/src/presentation/expedicao/app/format'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { TrocoLevarAppAviso } from '@/src/presentation/expedicao/app/tabs/TrocoLevarAppAviso'
import { ValorLinhaPagamentoInput } from '@/src/presentation/expedicao/app/tabs/ValorLinhaPagamentoInput'

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
  const valorJaPago = valorJaPagoFinalizarApp(cobrancas)
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
  const fecha = valorAlvo <= 0 || Math.abs(soma - valorAlvo) < 0.009
  const podeDividir = linhas.length > 1
  const podeFinalizar = valorAlvo <= 0 || (fecha && linhas.length > 0)

  return (
    <div className="fixed inset-0 z-[45] flex items-end justify-center bg-black/40 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div
        className="relative flex max-h-[min(88dvh,100%)] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-xl"
        aria-busy={props.ocupado}
      >
        {props.ocupado ? (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center bg-white/90"
            role="status"
            aria-live="polite"
          >
            <JiffyLoading text="Registrando entrega…" />
          </div>
        ) : null}
        <div
          data-expedicao-scroll
          className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain p-5"
        >
        <h2 className="text-lg font-semibold text-zinc-900">Entrega feita?</h2>
        <p className="mt-1 text-sm text-zinc-500">
          #{props.pedido.numeroVenda ?? props.pedido.codigoVenda} · {props.pedido.clienteNome}
        </p>
        <div className="mt-3 rounded-2xl bg-zinc-50 px-3 py-2.5 text-sm text-zinc-700">
          <p className="flex items-center justify-between">
            <span>Pedido</span>
            <span className="font-semibold text-zinc-900">{formatarMoedaApp(props.pedido.valorFinal)}</span>
          </p>
          {valorJaPago > 0 ? (
            <p className="mt-1 flex items-center justify-between text-zinc-500">
              <span>Já efetivado</span>
              <span className="font-medium">{formatarMoedaApp(valorJaPago)}</span>
            </p>
          ) : null}
          <p className="mt-1 flex items-center justify-between">
            <span>{valorAlvo > 0 ? 'A receber na porta' : 'Nada a receber'}</span>
            <span className="font-bold text-zinc-900">{formatarMoedaApp(valorAlvo)}</span>
          </p>
        </div>
        <TrocoLevarAppAviso valor={props.pedido.trocoLevar} className="mt-3" />

        {valorAlvo > 0 ? (
        <ul className="mt-4 space-y-2">
          {opcoes.map(opcao => {
            const marcado = selecionados.has(opcao.id)
            const indice = linhas.findIndex(linha => linha.meioPagamentoId === opcao.id)
            const linha = indice >= 0 ? linhas[indice] : null
            return (
              <li key={opcao.id}>
                <button
                  type="button"
                  disabled={props.ocupado}
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
                  <span className="min-w-0 flex-1 text-sm font-semibold text-zinc-900">{opcao.nome}</span>
                  {marcado && linha && !podeDividir ? (
                    <span className="text-sm font-bold text-zinc-900">{formatarMoedaApp(linha.valor)}</span>
                  ) : null}
                </button>
                {marcado && linha && podeDividir ? (
                  <label className="mt-1.5 flex items-center justify-between gap-3 rounded-2xl bg-zinc-50 px-3 py-2">
                    <span className="text-xs font-medium text-zinc-500">Valor</span>
                    <ValorLinhaPagamentoInput
                      valor={linha.valor}
                      onValor={valor =>
                        setLinhas(prev =>
                          atualizarValorLinhaFinalizarApp({
                            linhas: prev,
                            indice,
                            valor,
                            valorAlvo,
                          })
                        )
                      }
                    />
                  </label>
                ) : null}
              </li>
            )
          })}
        </ul>
        ) : null}

        {valorAlvo > 0 ? (
        <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 text-sm">
          <span className="font-medium text-zinc-600">
            {linhas.map(linha => opcoes.find(opcao => opcao.id === linha.meioPagamentoId)?.nome ?? 'Pagamento').join(' + ') || 'A receber'}
          </span>
          <span className="font-semibold text-zinc-900">{formatarMoedaApp(soma)}</span>
        </div>
        ) : null}
        {valorAlvo > 0 && !fecha ? (
          <p className="mt-2 text-xs text-amber-800">A soma precisa fechar {formatarMoedaApp(valorAlvo)}.</p>
        ) : null}
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-zinc-100 px-5 pb-4 pt-3">
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
            disabled={props.ocupado || !podeFinalizar}
            className="h-12 rounded-2xl bg-secondary text-sm font-semibold text-white disabled:opacity-50"
          >
            {props.ocupado ? 'Finalizando…' : 'Finalizar'}
          </button>
        </div>
      </div>
    </div>
  )
}
