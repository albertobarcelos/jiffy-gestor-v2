'use client'

import { useState } from 'react'
import Image from 'next/image'
import { MdCalendarMonth } from 'react-icons/md'
import {
  chaveDiaLocalComissao,
  rotuloDiaComissao,
  rotuloFaixaComissao,
  rotuloPeriodoComissao,
  dataDeChaveDiaLocal,
  type PeriodoComissaoEntregador,
} from '@/src/application/expedicao/app/periodoComissaoEntregador'
import type { IntervaloFiltroComissao } from '@/src/application/expedicao/app/visaoComissaoEntregador'
import type { ComissaoEntregadorApp } from '@/src/presentation/expedicao/app/api/expedicaoAppApi'
import type { PontoSerieDiariaComissao } from '@/src/application/expedicao/app/serieDiariaComissaoEntregador'
import { formatarMoedaApp } from '@/src/presentation/expedicao/app/format'
import { AppSpinner } from '@/src/presentation/expedicao/app/shell/AppSpinner'
import { ComissaoSerieDiariaChart } from '@/src/presentation/expedicao/app/tabs/ComissaoSerieDiariaChart'

const PERIODOS: Array<{ id: PeriodoComissaoEntregador; label: string }> = [
  { id: 'hoje', label: 'Hoje' },
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mês' },
]

type AbaInternaComissao = 'resumo' | 'entregas'

export function ComissoesTab(props: {
  loja: string
  periodo: PeriodoComissaoEntregador
  onPeriodo: (periodo: PeriodoComissaoEntregador) => void
  intervaloFiltro: IntervaloFiltroComissao | null
  onIntervaloFiltro: (faixa: IntervaloFiltroComissao | null) => void
  dados: ComissaoEntregadorApp | null
  serieDiaria: PontoSerieDiariaComissao[]
  carregando: boolean
  erro: string | null
  onTentarNovamente: () => void
}) {
  const [abaInterna, setAbaInterna] = useState<AbaInternaComissao>('resumo')
  const [calendarioAberto, setCalendarioAberto] = useState(false)
  const [rascunhoInicio, setRascunhoInicio] = useState(props.intervaloFiltro?.inicio ?? '')
  const [rascunhoFim, setRascunhoFim] = useState(props.intervaloFiltro?.fim ?? '')

  const hoje = chaveDiaLocalComissao(new Date())
  const faixa = props.intervaloFiltro
  const inicioFaixa = faixa ? dataDeChaveDiaLocal(faixa.inicio) : null
  const fimFaixa = faixa ? dataDeChaveDiaLocal(faixa.fim) : null
  const rotuloDia =
    inicioFaixa && fimFaixa
      ? rotuloFaixaComissao(inicioFaixa, fimFaixa)
      : rotuloPeriodoComissao(props.periodo)
  const mostrarStale = props.carregando && props.dados != null

  function aplicarFaixa(inicio: string, fim: string) {
    if (!inicio || !fim || !dataDeChaveDiaLocal(inicio) || !dataDeChaveDiaLocal(fim)) return
    const menor = inicio <= fim ? inicio : fim
    const maior = inicio <= fim ? fim : inicio
    props.onIntervaloFiltro({ inicio: menor, fim: maior > hoje ? hoje : maior })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="flex shrink-0 items-start justify-between gap-3 px-5 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="min-w-0 flex-1 pt-1">
          <div className="flex items-center gap-2">
            <h1 className="text-[28px] font-semibold tracking-tight text-zinc-900">Comissões</h1>
            {props.carregando ? <AppSpinner className="h-5 w-5" /> : null}
          </div>
          <p className="mt-0.5 text-sm font-medium capitalize text-zinc-600">{rotuloDia}</p>
          <p className="mt-2 truncate text-sm font-bold text-zinc-900" title={props.loja}>
            {props.loja}
          </p>
        </div>
        <Image
          src="/images/expedicao/comissao.png"
          alt=""
          width={220}
          height={220}
          className="h-[9.5rem] w-[9.5rem] shrink-0 object-contain object-right"
          priority
        />
      </header>

      <div className="shrink-0 space-y-2 px-4">
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 rounded-full bg-zinc-100 p-1">
            {PERIODOS.map(item => {
              const ativo = !faixa && props.periodo === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setCalendarioAberto(false)
                    setRascunhoInicio('')
                    setRascunhoFim('')
                    props.onPeriodo(item.id)
                  }}
                  className={`flex-1 rounded-full py-2 text-sm font-semibold ${
                    ativo ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'
                  }`}
                >
                  {item.label}
                </button>
              )
            })}
          </div>
          <button
            type="button"
            aria-label="Escolher período"
            onClick={() => {
              setCalendarioAberto(aberto => {
                const proximo = !aberto
                if (proximo) {
                  setRascunhoInicio(faixa?.inicio ?? '')
                  setRascunhoFim(faixa?.fim ?? '')
                }
                return proximo
              })
            }}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
              faixa || calendarioAberto
                ? 'bg-secondary text-white'
                : 'bg-zinc-100 text-zinc-600'
            }`}
          >
            <MdCalendarMonth className="h-5 w-5" />
          </button>
        </div>

        {calendarioAberto ? (
          <div className="space-y-2 rounded-2xl bg-white px-3 py-3 ring-1 ring-black/[0.06]">
            <div className="grid grid-cols-2 gap-2">
              <label className="min-w-0">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">De</span>
                <input
                  type="date"
                  value={rascunhoInicio}
                  max={hoje}
                  onChange={event => {
                    const inicio = event.target.value
                    setRascunhoInicio(inicio)
                    aplicarFaixa(inicio, rascunhoFim)
                  }}
                  className="mt-1 w-full bg-transparent text-sm font-semibold text-zinc-900 outline-none"
                />
              </label>
              <label className="min-w-0">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Até</span>
                <input
                  type="date"
                  value={rascunhoFim}
                  max={hoje}
                  min={rascunhoInicio || undefined}
                  onChange={event => {
                    const fim = event.target.value
                    setRascunhoFim(fim)
                    aplicarFaixa(rascunhoInicio, fim)
                  }}
                  className="mt-1 w-full bg-transparent text-sm font-semibold text-zinc-900 outline-none"
                />
              </label>
            </div>
            {faixa ? (
              <button
                type="button"
                onClick={() => {
                  setRascunhoInicio('')
                  setRascunhoFim('')
                  setCalendarioAberto(false)
                  props.onIntervaloFiltro(null)
                }}
                className="text-xs font-semibold text-secondary"
              >
                Limpar período
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="flex rounded-full bg-zinc-100 p-1">
          {(
            [
              { id: 'resumo', label: 'Resumo' },
              { id: 'entregas', label: 'Entregas' },
            ] as const
          ).map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => setAbaInterna(item.id)}
              className={`flex-1 rounded-full py-2 text-sm font-semibold ${
                abaInterna === item.id ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div
        data-expedicao-scroll
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5"
      >
        {props.carregando && !props.dados ? (
          <div className="flex justify-center pt-10">
            <AppSpinner className="h-8 w-8" />
          </div>
        ) : null}
        {props.erro && !props.dados ? (
          <div className="flex flex-col items-center pt-8 text-center">
            <p className="text-sm text-red-600">{props.erro}</p>
            <button
              type="button"
              onClick={props.onTentarNovamente}
              className="mt-3 text-sm font-semibold text-secondary"
            >
              Tentar de novo
            </button>
          </div>
        ) : null}
        {props.dados ? (
          <div className={`mt-5 space-y-3 pb-4 ${mostrarStale ? 'opacity-60' : ''}`}>
            {abaInterna === 'resumo' ? (
              <>
                <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
                  <p className="text-sm text-zinc-500">Você fez neste período</p>
                  <p className="mt-0.5 text-xs font-medium capitalize text-zinc-400">{rotuloDia}</p>
                  <p className="mt-1 text-3xl font-semibold text-zinc-900">
                    {formatarMoedaApp(props.dados.totalTaxas)}
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {props.dados.quantidade}{' '}
                    {props.dados.quantidade === 1 ? 'entrega confirmada' : 'entregas confirmadas'}
                  </p>
                </div>
                <ComissaoSerieDiariaChart serie={props.serieDiaria} />
              </>
            ) : props.dados.itens.length === 0 ? (
              <p className="px-2 pt-6 text-center text-sm text-zinc-500">
                Só entra aqui depois que você confirma a entrega. Pedido pronto ou em rota ainda não
                conta.
              </p>
            ) : (
              <ul className="space-y-2">
                {props.dados.itens.map(item => (
                  <li
                    key={item.id}
                    className="rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-black/[0.04]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 leading-none">
                          <span className="text-[28px] font-extrabold tracking-tight text-zinc-900">
                            #{item.numeroVenda ?? item.codigoVenda}
                          </span>
                          {item.numeroVenda && item.codigoVenda ? (
                            <span className="text-sm font-semibold tracking-wide text-zinc-500">
                              {item.codigoVenda}
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-2 truncate text-sm font-medium text-zinc-600">
                          {item.clienteNome || 'Cliente'}
                        </p>
                        {item.dataFinalizacao ? (
                          <p className="mt-1 text-xs capitalize text-zinc-400">
                            {rotuloDiaComissao(new Date(item.dataFinalizacao))}
                          </p>
                        ) : null}
                      </div>
                      <p className="shrink-0 pt-1 text-sm font-semibold text-emerald-600">
                        {formatarMoedaApp(item.taxaEntrega ?? 0)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
