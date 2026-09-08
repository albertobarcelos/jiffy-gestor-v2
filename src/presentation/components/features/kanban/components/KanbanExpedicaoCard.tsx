'use client'

import { MdDeliveryDining, MdStorefront, MdTwoWheeler } from 'react-icons/md'
import {
  nomeClienteCurtoKanban,
  rotuloTipoAtendimentoKanban,
  tipoAtendimentoKanban,
} from '../utils/kanbanPedidoIdentidade'
import { relogioPedidoKanban, type TomTempoPedidoKanban } from '../utils/kanbanPedidoTempo'
import type { ColunaKanbanId, Venda } from '../types'
import { KanbanAvancarEtapaCompacto } from './KanbanAvancarEtapaCompacto'

const TOM_PILL: Record<TomTempoPedidoKanban, string> = {
  ok: 'bg-slate-100 text-slate-600',
  alerta: 'bg-orange-400 text-orange-950',
  atraso: 'bg-red-600 text-white',
}

export interface KanbanExpedicaoCardProps {
  venda: Venda
  colunaId: ColunaKanbanId
  agoraMs: number
  avancando: boolean
  onViewDetails: (venda: Venda) => void
  onAvancarEtapa: (venda: Venda, colunaAtual: ColunaKanbanId) => void
}

function IconeTipo({ tipo }: { tipo: ReturnType<typeof tipoAtendimentoKanban> }) {
  if (tipo === 'retirada') return <MdStorefront className="h-3.5 w-3.5" />
  if (tipo === 'entrega') return <MdTwoWheeler className="h-3.5 w-3.5" />
  return <MdDeliveryDining className="h-3.5 w-3.5" />
}

export function KanbanExpedicaoCard({
  venda,
  colunaId,
  agoraMs,
  avancando,
  onViewDetails,
  onAvancarEtapa,
}: KanbanExpedicaoCardProps) {
  const tipo = tipoAtendimentoKanban(venda.tipoVenda)
  const relogio = relogioPedidoKanban(venda, agoraMs)
  const cancelada = venda.isCancelada()
  const finalizada = colunaId === 'FINALIZADAS'
  const cobrar = venda.precisaConfirmarPagamentoParaFinalizar()
  const atrasado = Boolean(relogio.rotuloAtraso)
  const tempo = atrasado
    ? relogio.rotuloAtraso?.replace(/^Atraso\s+/i, '')
    : relogio.rotuloDecorrido

  return (
    <article
      className={`flex min-w-0 flex-col rounded-xl border bg-white p-2.5 text-left shadow-sm ${
        cancelada ? 'border-gray-200 opacity-70' : 'border-gray-200'
      }`}
    >
      <button
        type="button"
        onClick={() => onViewDetails(venda)}
        className="flex min-w-0 flex-1 flex-col text-left"
      >
        <p className="truncate text-[12px] font-semibold leading-tight text-gray-800">
          {nomeClienteCurtoKanban(venda.cliente?.nome)}
        </p>

        <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-gray-500">
          <IconeTipo tipo={tipo} />
          {rotuloTipoAtendimentoKanban(tipo)}
        </span>

        <p className="mt-2 text-[1.75rem] font-black leading-none tracking-tight text-gray-950">
          {venda.numeroVenda}
        </p>

        {finalizada ? (
          <span
            className={`mt-2 text-[11px] font-semibold ${
              cancelada ? 'text-red-600' : 'text-emerald-600'
            }`}
          >
            {cancelada ? 'Cancelado' : 'Concluído'}
          </span>
        ) : (
          <div className="mt-2 flex flex-col items-start gap-1">
            {tempo ? (
              <span
                className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${TOM_PILL[relogio.tom]}`}
              >
                {atrasado ? `Atraso ${tempo}` : tempo}
              </span>
            ) : null}
            {cobrar ? (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                Cobrar na entrega
              </span>
            ) : null}
          </div>
        )}
      </button>

      {finalizada ? null : (
        <div className="mt-3">
          <KanbanAvancarEtapaCompacto
            venda={venda}
            colunaAtual={colunaId}
            avancando={avancando}
            onAvancar={onAvancarEtapa}
            destaque
          />
        </div>
      )}
    </article>
  )
}
