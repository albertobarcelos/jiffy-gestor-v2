'use client'

import { useEffect, useRef, useState, type TouchEvent } from 'react'
import Image from 'next/image'
import { MdWhatsapp } from 'react-icons/md'
import type {
  ComissaoEntregadorApp,
  PedidoResumoAppEntregador,
} from '@/src/presentation/expedicao/app/api/expedicaoAppApi'
import { formatarMoedaApp } from '@/src/presentation/expedicao/app/format'
import { AppSpinner } from '@/src/presentation/expedicao/app/shell/AppSpinner'
import { hrefWazeNavegacaoApp } from '@/src/application/expedicao/app/navegacaoEntregadorApp'
import { hrefWhatsAppApp } from '@/src/application/expedicao/app/telefoneEntregadorApp'

const LIMIAR_PUXAR_PX = 64

export function PedidosTab(props: {
  loja: string
  hoje: ComissaoEntregadorApp | null
  linhaRecorde: string | null
  pedidos: PedidoResumoAppEntregador[]
  carregando: boolean
  atualizando?: boolean
  erro: string | null
  confirmandoId: string | null
  onAbrir: (pedidoId: string) => void
  onPedirConfirmacao: (pedidoId: string) => void
  onTentarNovamente: () => void
  onAtualizar: () => Promise<void>
}) {
  const entregasHoje = props.hoje?.quantidade ?? 0
  const listaVazia = !props.carregando && !props.erro && props.pedidos.length === 0
  const puxar = usePuxarParaAtualizar(props.onAtualizar, !props.carregando)

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-zinc-50">
      <header className="flex shrink-0 items-start justify-between gap-4 bg-white px-5 pb-5 pt-[max(1.5rem,env(safe-area-inset-top))] shadow-sm ring-1 ring-black/[0.03]">
        <div className="flex min-w-0 items-center gap-2 pt-1">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white">
            {props.loja.charAt(0).toUpperCase()}
          </span>
          <p className="truncate text-sm font-bold tracking-wide text-zinc-900" title={props.loja}>
            {props.loja}
          </p>
        </div>
        <div className="flex min-w-0 shrink-0 flex-col items-end">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            Hoje · {entregasHoje} {entregasHoje === 1 ? 'entrega' : 'entregas'}
          </p>
          {props.hoje ? (
            <>
              <p className="text-[22px] font-extrabold tracking-tight text-emerald-600">
                {formatarMoedaApp(props.hoje.totalTaxas)}
              </p>
              {props.linhaRecorde ? (
                <p className="max-w-[11.5rem] text-right text-[11px] font-semibold text-zinc-500">
                  {props.linhaRecorde}
                </p>
              ) : null}
            </>
          ) : (
            <>
              <p className="h-7 w-20 animate-pulse rounded bg-zinc-100" aria-hidden />
              <p className="mt-1 text-[11px] font-semibold text-zinc-400">—</p>
            </>
          )}
        </div>
      </header>

      <div
        ref={puxar.scrollRef}
        data-expedicao-scroll
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-4 pt-4"
        onTouchStart={puxar.onTouchStart}
        onTouchMove={puxar.onTouchMove}
        onTouchEnd={() => void puxar.onTouchEnd()}
      >
        {puxar.deslocamento > 0 || puxar.atualizando || props.atualizando ? (
          <div
            className="flex items-center justify-center overflow-hidden text-zinc-400"
            style={{ height: Math.max(puxar.deslocamento, puxar.atualizando || props.atualizando ? 36 : 0) }}
          >
            <AppSpinner className="h-5 w-5" />
          </div>
        ) : null}

        {props.carregando ? <PedidosSkeleton /> : null}

        {props.erro && !props.carregando ? (
          <div className="flex flex-col items-center px-4 pt-16 text-center">
            <p className="text-base font-semibold text-zinc-900">Não deu para carregar os pedidos</p>
            <p className="mt-1 text-sm text-zinc-500">{props.erro}</p>
            <button
              type="button"
              onClick={props.onTentarNovamente}
              className="mt-4 h-10 rounded-xl bg-secondary px-4 text-sm font-semibold text-white"
            >
              Tentar de novo
            </button>
          </div>
        ) : null}

        {listaVazia ? (
          <div className="flex flex-col items-center px-2 pt-16 text-center">
            <Image
              src="/images/expedicao/tudo_certo.png"
              alt=""
              width={420}
              height={420}
              className="h-auto w-[min(92vw,420px)]"
              priority
            />
            <p className="mt-2 text-xl font-bold text-zinc-900">Tudo entregue!</p>
            <p className="mt-2 max-w-[17rem] text-[13px] leading-relaxed text-zinc-500">
              Quando a loja te despachar, o pedido entra nesta lista. Use Coletar para bipar na porta.
            </p>
          </div>
        ) : null}

        {!props.carregando ? (
          <ul className="space-y-3 pb-6">
            {props.pedidos.map(pedido => {
              const confirmando = props.confirmandoId === pedido.id
              const bloqueado = props.confirmandoId != null
              const waze = hrefWazeNavegacaoApp({
                endereco: pedido.enderecoNavegacao,
                latitude: pedido.latitude,
                longitude: pedido.longitude,
              })
              const whats = hrefWhatsAppApp(pedido.telefone)
              return (
                <li key={pedido.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
                  <button
                    type="button"
                    onClick={() => props.onAbrir(pedido.id)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 leading-none">
                        <span className="text-[28px] font-extrabold tracking-tight text-zinc-900">
                          #{pedido.numeroVenda ?? pedido.codigoVenda}
                        </span>
                        {pedido.numeroVenda && pedido.codigoVenda ? (
                          <span className="text-sm font-semibold tracking-wide text-zinc-500">
                            {pedido.codigoVenda}
                          </span>
                        ) : null}
                      </p>
                      <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-600">
                        {pedido.etapa === 'EM_ROTA' ? 'Em rota' : 'Pronto'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-zinc-600">{pedido.clienteNome}</p>
                    <p className="mt-1 text-sm font-semibold leading-5 text-zinc-900">
                      {pedido.endereco || pedido.bairro || 'Endereço não informado'}
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-zinc-50 px-3 py-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                          Pagamento
                        </p>
                        <p className="mt-0.5 truncate text-base font-extrabold text-zinc-900">
                          {pedido.formaPagamento || (pedido.faltaPagar > 0 ? 'Na entrega' : 'Pago')}
                        </p>
                      </div>
                      <div
                        className={`rounded-xl px-3 py-2.5 ${
                          pedido.faltaPagar > 0 ? 'bg-amber-50' : 'bg-emerald-50'
                        }`}
                      >
                        <p
                          className={`text-[10px] font-bold uppercase tracking-wide ${
                            pedido.faltaPagar > 0 ? 'text-amber-700/70' : 'text-emerald-700/70'
                          }`}
                        >
                          {pedido.faltaPagar > 0 ? 'A cobrar' : 'A cobrar'}
                        </p>
                        <p
                          className={`mt-0.5 text-base font-extrabold ${
                            pedido.faltaPagar > 0 ? 'text-amber-700' : 'text-emerald-700'
                          }`}
                        >
                          {pedido.faltaPagar > 0 ? formatarMoedaApp(pedido.faltaPagar) : 'Pago'}
                        </p>
                      </div>
                    </div>
                  </button>
                  {waze || whats ? (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {waze ? (
                        <a
                          href={waze}
                          target="_blank"
                          rel="noreferrer"
                          aria-label="Abrir no Waze"
                          onClick={event => event.stopPropagation()}
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
                      ) : (
                        <span />
                      )}
                      {whats ? (
                        <a
                          href={whats}
                          target="_blank"
                          rel="noreferrer"
                          onClick={event => event.stopPropagation()}
                          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-zinc-100 text-sm font-semibold text-zinc-800"
                        >
                          <MdWhatsapp className="h-4 w-4" aria-hidden />
                          WhatsApp
                        </a>
                      ) : null}
                    </div>
                  ) : null}
                  {pedido.etapa === 'EM_ROTA' ? (
                    <button
                      type="button"
                      disabled={bloqueado}
                      onClick={() => props.onPedirConfirmacao(pedido.id)}
                      className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-secondary text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {confirmando ? <AppSpinner tom="branco" /> : null}
                      {confirmando ? 'Finalizando…' : 'Entrega feita'}
                    </button>
                  ) : null}
                </li>
              )
            })}
          </ul>
        ) : null}
      </div>
    </div>
  )
}

function PedidosSkeleton() {
  return (
    <ul className="space-y-3" aria-busy="true" aria-label="Carregando pedidos">
      {['a', 'b', 'c'].map(chave => (
        <li key={chave} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
          <div className="h-8 w-20 animate-pulse rounded bg-zinc-100" />
          <div className="mt-2 h-4 w-40 animate-pulse rounded bg-zinc-100" />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="h-14 animate-pulse rounded-xl bg-zinc-100" />
            <div className="h-14 animate-pulse rounded-xl bg-zinc-100" />
          </div>
        </li>
      ))}
    </ul>
  )
}

function usePuxarParaAtualizar(onAtualizar: () => Promise<void>, habilitado: boolean) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const inicioY = useRef<number | null>(null)
  const deltaRef = useRef(0)
  const [deslocamento, setDeslocamento] = useState(0)
  const [atualizando, setAtualizando] = useState(false)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onMove = (event: globalThis.TouchEvent) => {
      if (inicioY.current == null) return
      const delta = Math.max(0, event.touches[0].clientY - inicioY.current)
      if (delta > 0 && event.cancelable) event.preventDefault()
      deltaRef.current = Math.min(delta, 96)
      setDeslocamento(deltaRef.current)
    }
    el.addEventListener('touchmove', onMove, { passive: false })
    return () => el.removeEventListener('touchmove', onMove)
  }, [])

  return {
    scrollRef,
    deslocamento,
    atualizando,
    onTouchStart: (event: TouchEvent) => {
      if (!habilitado || atualizando) return
      if (scrollRef.current && scrollRef.current.scrollTop > 0) return
      inicioY.current = event.touches[0].clientY
    },
    onTouchMove: (event: TouchEvent) => {
      if (inicioY.current == null) return
      const delta = Math.max(0, event.touches[0].clientY - inicioY.current)
      deltaRef.current = Math.min(delta, 96)
      setDeslocamento(deltaRef.current)
    },
    onTouchEnd: async () => {
      if (inicioY.current == null) return
      inicioY.current = null
      if (deltaRef.current < LIMIAR_PUXAR_PX) {
        deltaRef.current = 0
        setDeslocamento(0)
        return
      }
      setAtualizando(true)
      try {
        await onAtualizar()
      } finally {
        deltaRef.current = 0
        setDeslocamento(0)
        setAtualizando(false)
      }
    },
  }
}
