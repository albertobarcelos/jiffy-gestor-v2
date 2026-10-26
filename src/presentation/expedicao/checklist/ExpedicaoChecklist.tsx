'use client'

import { useEffect, useRef } from 'react'
import type { PedidoLeituraExpedicao } from '@/src/application/expedicao/avaliarPedidoParaRodada'
import { AppSpinner } from '@/src/presentation/expedicao/app/shell/AppSpinner'
import { marcarItemCompletaConferencia } from '@/src/application/expedicao/marcarItemCompletaConferencia'

type ExpedicaoChecklistProps = {
  pedido: PedidoLeituraExpedicao
  indice: number
  total: number
  marcados: Record<string, boolean>
  ocupado: boolean
  onToggle: (itemId: string) => void
  onContinuar: () => void
  onVoltar: () => void
  rotuloFinal?: string
  rotuloFinalOcupado?: string
}

export function ExpedicaoChecklist({
  pedido,
  indice,
  total,
  marcados,
  ocupado,
  onToggle,
  onContinuar,
  onVoltar,
  rotuloFinal = 'Expedir',
  rotuloFinalOcupado = 'Expedindo…',
}: ExpedicaoChecklistProps) {
  const listaRef = useRef<HTMLUListElement>(null)
  const ultimoDaRodada = indice + 1 >= total

  useEffect(() => {
    listaRef.current?.scrollTo({ top: 0 })
  }, [pedido.id])

  const conferirItem = (itemId: string) => {
    const completa = marcarItemCompletaConferencia({
      itemIds: pedido.itens.map(item => item.id),
      marcados,
      itemId,
    })
    onToggle(itemId)
    if (completa && !ultimoDaRodada && !ocupado) onContinuar()
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b border-black/5 px-6 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
          Pedido {indice + 1} de {total}
        </p>
        <h1 className="text-2xl font-semibold text-primary-text">
          {pedido.numeroVenda != null ? `#${pedido.numeroVenda}` : `#${pedido.codigoVenda}`} · {pedido.clienteNome}
        </h1>
        {pedido.bairro ? <p className="text-sm text-secondary-text">{pedido.bairro}</p> : null}
      </header>

      <ul
        key={pedido.id}
        ref={listaRef}
        data-expedicao-scroll
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-y-contain px-6 py-5"
      >
        {pedido.itens.length === 0 ? (
          <li className="text-base text-secondary-text">Sem itens para conferir neste pedido.</li>
        ) : (
          pedido.itens.map(item => {
            const marcado = Boolean(marcados[item.id])
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => conferirItem(item.id)}
                  className={`flex w-full items-center gap-4 rounded-2xl px-5 py-5 text-left ring-1 ${
                    marcado
                      ? 'bg-emerald-50 ring-emerald-200'
                      : 'bg-white ring-black/5'
                  }`}
                >
                  <span
                    aria-hidden
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-lg font-bold ${
                      marcado ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {marcado ? '✓' : ''}
                  </span>
                  <span className="flex-1">
                    <span className="block text-lg font-semibold text-primary-text">{item.nome}</span>
                    <span className="text-sm text-secondary-text">{item.quantidade}x</span>
                  </span>
                </button>
              </li>
            )
          })
        )}
      </ul>

      <footer className="grid shrink-0 grid-cols-2 gap-3 border-t border-black/5 bg-white px-6 py-4">
        <button
          type="button"
          disabled={ocupado}
          onClick={onVoltar}
          className="h-14 rounded-2xl bg-slate-100 text-base font-semibold text-slate-800"
        >
          Voltar
        </button>
        <button
          type="button"
          disabled={ocupado}
          onClick={onContinuar}
          className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-white disabled:opacity-40"
        >
          {ocupado && indice + 1 >= total ? <AppSpinner tom="branco" /> : null}
          {ocupado && indice + 1 >= total ? rotuloFinalOcupado : indice + 1 >= total ? rotuloFinal : 'Próximo'}
        </button>
      </footer>
    </div>
  )
}
