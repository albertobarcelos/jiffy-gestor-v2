'use client'

import { useState } from 'react'
import {
  MdChevronRight,
  MdHistory,
  MdLock,
  MdLogin,
  MdPersonOutline,
} from 'react-icons/md'
import type { OperacaoCaixaEstacaoListaItemDTO } from '@/src/application/dto/caixa-estacao/OperacaoCaixaEstacaoDTO'
import { calcularDuracaoOperacaoCaixa } from '@/src/application/caixa-estacao/fechamentoCaixaEstacaoRelatorio'
import { useEstacaoDestePc } from '@/src/presentation/hooks/caixa-estacao/useEstacaoDestePc'
import { useHistoricoCaixaEstacao } from '@/src/presentation/hooks/caixa-estacao/useFecharCaixaEstacao'
import { DetalhesFechamentoEstacao } from './DetalhesFechamentoEstacao'
import { CaixaEstacaoNaoVinculada } from './CaixaEstacaoNaoVinculada'
import { cn } from '@/src/shared/utils/cn'

type DataHoraCard = {
  data: string
  hora: string
}

function formatarDataHoraClara(iso: string | null | undefined): DataHoraCard {
  if (!iso?.trim()) return { data: '—', hora: '—' }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return { data: '—', hora: '—' }
  return {
    data: d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }),
    hora: d.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  }
}


function LinhaEventoCaixa({
  tipo,
  dataHora,
  usuario,
}: {
  tipo: 'abertura' | 'fechamento'
  dataHora: DataHoraCard
  usuario: string
}) {
  const abertura = tipo === 'abertura'

  return (
    <div className="flex gap-2.5">
      <div
        className={cn(
          'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
          abertura ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'
        )}
      >
        {abertura ? (
          <MdLogin className="h-4 w-4" aria-hidden />
        ) : (
          <MdLock className="h-3.5 w-3.5" aria-hidden />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-secondary-text">
          {abertura ? 'Abertura' : 'Fechamento'}
        </p>
        <p className="mt-0.5 text-sm font-bold tabular-nums leading-snug text-primary-text">
          {dataHora.data}
          <span className="mx-1.5 font-normal text-secondary-text/70">·</span>
          {dataHora.hora}
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-secondary-text">
          <MdPersonOutline className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate">{usuario}</span>
        </p>
      </div>
    </div>
  )
}

function FechamentoHistoricoCard({
  item,
  embedded,
  onClick,
}: {
  item: OperacaoCaixaEstacaoListaItemDTO
  embedded: boolean
  onClick: () => void
}) {
  const abertura = formatarDataHoraClara(item.dataAbertura)
  const fechamento = formatarDataHoraClara(item.dataFechamento)
  const duracao = calcularDuracaoOperacaoCaixa(item.dataAbertura, item.dataFechamento)

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group w-full rounded-2xl border border-gray-200 bg-white text-left shadow-sm transition-all hover:border-primary/35 hover:shadow-md',
        embedded ? 'p-3' : 'p-4'
      )}
    >
      <div className="flex items-stretch gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center self-start rounded-xl bg-slate-100 text-slate-500 transition-colors group-hover:bg-primary/10 group-hover:text-primary">
          <MdLock className="h-5 w-5" aria-hidden />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
              Fechado
            </span>
            {duracao ? (
              <span className="text-xs font-medium text-secondary-text">{duracao} de operação</span>
            ) : null}
          </div>

          <div className="mt-3 space-y-3 border-t border-dashed border-gray-200/80 pt-3">
            <LinhaEventoCaixa
              tipo="abertura"
              dataHora={abertura}
              usuario={item.abertoPorAtor.nome?.trim() || '—'}
            />
            <LinhaEventoCaixa
              tipo="fechamento"
              dataHora={fechamento}
              usuario={item.fechadoPorAtor?.nome?.trim() || '—'}
            />
          </div>
        </div>

        <MdChevronRight
          className="my-auto h-5 w-5 shrink-0 text-gray-300 transition-colors group-hover:text-primary"
          aria-hidden
        />
      </div>
    </button>
  )
}

export function FechamentosList({
  limit,
  embedded = false,
  onAbrirConfiguracaoEstacao,
}: {
  limit?: number
  embedded?: boolean
  onAbrirConfiguracaoEstacao?: () => void
} = {}) {
  const { estacaoId } = useEstacaoDestePc()
  const historico = useHistoricoCaixaEstacao(estacaoId)
  const [idDetalhe, setIdDetalhe] = useState<string | null>(null)

  if (!estacaoId) {
    if (embedded || !onAbrirConfiguracaoEstacao) return null
    return <CaixaEstacaoNaoVinculada onAbrirConfiguracao={onAbrirConfiguracaoEstacao} />
  }

  if (historico.isLoading) {
    return (
      <div
        className={cn(
          'text-center text-sm text-secondary-text',
          embedded ? 'py-6' : 'rounded-2xl border border-gray-200 bg-white px-4 py-10'
        )}
      >
        Carregando caixas recentes…
      </div>
    )
  }

  const items = (historico.data?.items ?? []).slice(0, limit)

  if (historico.isError) {
    return (
      <div
        className={cn(
          'text-sm text-error',
          embedded ? 'py-2' : 'rounded-2xl border border-red-200 bg-red-50 px-4 py-4'
        )}
      >
        {historico.error instanceof Error ? historico.error.message : 'Erro ao listar caixas recentes.'}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div
        className={cn(
          embedded
            ? 'rounded-xl border border-dashed border-gray-200 bg-white px-4 py-8 text-center'
            : 'rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-12 text-center'
        )}
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <MdHistory className="h-7 w-7" aria-hidden />
        </div>
        <p className="text-sm font-semibold text-primary-text">Nenhum caixa fechado ainda</p>
        <p className="mx-auto mt-1.5 max-w-[16rem] text-xs leading-relaxed text-secondary-text">
          Os fechamentos aparecem aqui depois do primeiro fechamento.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      {items.map(item => (
        <FechamentoHistoricoCard
          key={item.id}
          item={item}
          embedded={embedded}
          onClick={() => setIdDetalhe(item.id)}
        />
      ))}

      {idDetalhe ? (
        <DetalhesFechamentoEstacao
          idOperacaoCaixa={idDetalhe}
          open
          onClose={() => setIdDetalhe(null)}
        />
      ) : null}
    </div>
  )
}
