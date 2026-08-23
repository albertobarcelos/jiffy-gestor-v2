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
  ok: 'bg-slate-200 text-slate-700',
  alerta: 'bg-amber-400 text-amber-950',
  atraso: 'bg-red-700 text-white',
}

export interface KanbanExpedicaoCardProps {
  venda: Venda
  colunaId: ColunaKanbanId
  agoraMs: number
  densidade: 'principal' | 'secundaria'
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
  densidade,
  avancando,
  onViewDetails,
  onAvancarEtapa,
}: KanbanExpedicaoCardProps) {
  const tipo = tipoAtendimentoKanban(venda.tipoVenda)
  const relogio = relogioPedidoKanban(venda, agoraMs)
  const cancelada = venda.isCancelada()
  const finalizada = colunaId === 'FINALIZADAS'
  const compacta = densidade === 'secundaria'

  return (
    <button
      type="button"
      onClick={() => onViewDetails(venda)}
      className={`flex w-full flex-col rounded-xl border bg-white text-left shadow-sm transition-shadow hover:shadow-md ${
        cancelada ? 'border-gray-200 opacity-70' : 'border-gray-200'
      } ${compacta ? 'gap-1 p-2' : 'gap-1.5 p-2.5'}`}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-600">
          <IconeTipo tipo={tipo} />
          {rotuloTipoAtendimentoKanban(tipo)}
        </span>
        {relogio.rotuloAtraso ? (
          <span className="rounded-md bg-red-800 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {relogio.rotuloAtraso}
          </span>
        ) : null}
      </div>

      <div className="min-w-0">
        <p className={`font-black leading-none text-gray-950 ${compacta ? 'text-xl' : 'text-2xl'}`}>
          {venda.numeroVenda}
        </p>
        <p className="mt-0.5 truncate text-xs font-medium text-gray-700">
          {nomeClienteCurtoKanban(venda.cliente?.nome)}
        </p>
      </div>

      {finalizada ? (
        <p
          className={`text-[11px] font-semibold ${
            cancelada ? 'text-red-600' : 'text-emerald-600'
          }`}
        >
          {cancelada ? 'Cancelado' : 'Concluído'}
        </p>
      ) : (
        <div className="mt-auto flex items-end justify-between gap-1">
          {relogio.rotuloDecorrido || relogio.rotuloHa ? (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${TOM_PILL[relogio.tom]}`}
            >
              {compacta ? relogio.rotuloHa : relogio.rotuloDecorrido}
            </span>
          ) : (
            <span />
          )}
          <KanbanAvancarEtapaCompacto
            venda={venda}
            colunaAtual={colunaId}
            avancando={avancando}
            onAvancar={onAvancarEtapa}
          />
        </div>
      )}
    </button>
  )
}
