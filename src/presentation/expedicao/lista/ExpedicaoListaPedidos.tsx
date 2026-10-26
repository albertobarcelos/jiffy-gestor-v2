'use client'

import { useEffect, useRef } from 'react'
import type { PedidoLeituraExpedicao } from '@/src/application/expedicao/avaliarPedidoParaRodada'

type ExpedicaoListaPedidosProps = {
  entregadorNome: string
  pedidos: PedidoLeituraExpedicao[]
  avisos: Array<{ codigo: string; motivo: string }>
  ocupado: boolean
  onExpedirExpress: () => void
  onExpedirComConferencia: () => void
  onTrocarEntregador: () => void
  onCodigoManual: (codigo: string) => void
}

export function ExpedicaoListaPedidos({
  entregadorNome,
  pedidos,
  avisos,
  ocupado,
  onExpedirExpress,
  onExpedirComConferencia,
  onTrocarEntregador,
  onCodigoManual,
}: ExpedicaoListaPedidosProps) {
  const campoRef = useRef<HTMLInputElement>(null)
  const podeExpedir = pedidos.length > 0 && !ocupado

  useEffect(() => {
    const id = window.setTimeout(() => campoRef.current?.focus(), 0)
    return () => window.clearTimeout(id)
  }, [ocupado, pedidos.length, avisos.length])

  const enviar = (valor: string) => {
    const codigo = valor.trim()
    if (!codigo) return
    onCodigoManual(codigo)
    if (campoRef.current) campoRef.current.value = ''
    campoRef.current?.focus()
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-black/5 px-6 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">Na porta</p>
          <h1 className="text-2xl font-semibold text-primary-text">{entregadorNome}</h1>
        </div>
        <button
          type="button"
          onClick={onTrocarEntregador}
          className="rounded-xl px-4 py-2 text-sm font-semibold text-secondary-text underline-offset-4 hover:underline"
        >
          Trocar
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col px-6 py-5">
        <form
          className="flex shrink-0 gap-2"
          onSubmit={event => {
            event.preventDefault()
            enviar(campoRef.current?.value ?? '')
          }}
        >
          <input
            ref={campoRef}
            name="codigoManual"
            data-expedicao-leitor="off"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
            enterKeyHint="done"
            placeholder="Bipa o QR ou digite o código"
            onKeyDown={event => {
              if (event.key === 'Escape') {
                event.preventDefault()
                event.stopPropagation()
                if (campoRef.current) campoRef.current.value = ''
              }
            }}
            className="h-16 flex-1 rounded-2xl border-2 border-primary/25 bg-white px-5 text-xl font-semibold uppercase tracking-wide text-primary-text outline-none ring-primary/20 focus:ring-4"
          />
          <button
            type="submit"
            disabled={ocupado}
            className="h-16 rounded-2xl bg-slate-800 px-5 text-base font-semibold text-white disabled:opacity-40"
          >
            Ler
          </button>
        </form>

        {avisos.length > 0 ? (
          <ul className="mt-4 shrink-0 space-y-2">
            {avisos.map(aviso => (
              <li key={`${aviso.codigo}-${aviso.motivo}`} className="text-sm font-medium text-amber-800">
                {aviso.codigo}: {aviso.motivo}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto pt-6">
          {pedidos.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-2xl font-semibold text-primary-text">Aguardando leitura</p>
              <p className="mt-2 text-base text-secondary-text">
                Bipa o QR no rodapé da via ou digite o código da venda no campo acima.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {pedidos.map(pedido => (
                <li
                  key={pedido.id}
                  className="rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-black/5"
                >
                  <p className="text-lg font-semibold text-primary-text">
                    {pedido.numeroVenda != null ? `#${pedido.numeroVenda}` : `#${pedido.codigoVenda}`}
                    <span className="ml-2 text-sm font-medium text-secondary-text">{pedido.codigoVenda}</span>
                  </p>
                  <p className="mt-1 text-base text-primary-text">{pedido.clienteNome}</p>
                  {pedido.bairro ? (
                    <p className="text-sm text-secondary-text">{pedido.bairro}</p>
                  ) : null}
                  {pedido.etapa ? (
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-secondary-text">
                      {pedido.etapa.replaceAll('_', ' ')}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <footer className="grid grid-cols-1 gap-3 border-t border-black/5 bg-white px-6 py-4 md:grid-cols-2">
        <button
          type="button"
          disabled={!podeExpedir}
          onClick={onExpedirComConferencia}
          className="h-14 rounded-2xl bg-slate-100 text-base font-semibold text-slate-800 disabled:opacity-40"
        >
          Conferir itens
          <span className="ml-2 hidden text-xs font-medium text-slate-500 md:inline">F3</span>
        </button>
        <button
          type="button"
          disabled={!podeExpedir}
          onClick={onExpedirExpress}
          className="h-14 rounded-2xl bg-primary text-base font-semibold text-white disabled:opacity-40"
        >
          Expedir express
          <span className="ml-2 hidden text-xs font-medium text-white/80 md:inline">F2</span>
        </button>
      </footer>
    </div>
  )
}
