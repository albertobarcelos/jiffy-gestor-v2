'use client'

import { Fragment } from 'react'
import {
  formatarHoraDetalhePedido,
  formatarHoraPrevisaoEntrega,
} from '../novo-pedido/novoPedidoDetalheHelpers'
import type { DetalhesEntregaPedido } from '../novo-pedido/types'
import { COLUNAS_ENTREGA_OPERACIONAIS } from './fiscalFlowKanban.rules'
import type { ColunaKanbanId } from './types'

interface PedidoKanbanProgressoEntregaProps {
  colunaAtual: ColunaKanbanId
  dataCriacao?: string | null
  detalhesEntrega?: DetalhesEntregaPedido | null
}

const ETAPAS_PROGRESSO = [
  { id: 'criado', label: 'Criado' },
  { id: 'preparo', label: 'Preparo' },
  { id: 'pronto', label: 'Pronto' },
  { id: 'em-rota', label: 'Em Rota / Retirada' },
  { id: 'previsao', label: 'Previsão' },
] as const

function resolverIndiceEtapaColuna(colunaAtual: ColunaKanbanId): number {
  const idx = COLUNAS_ENTREGA_OPERACIONAIS.indexOf(colunaAtual)
  if (idx >= 0) return idx
  return ETAPAS_PROGRESSO.length - 1
}

function obterHoraEtapa(
  etapaId: (typeof ETAPAS_PROGRESSO)[number]['id'],
  dataCriacao?: string | null,
  detalhesEntrega?: DetalhesEntregaPedido | null
): string {
  switch (etapaId) {
    case 'criado':
      return formatarHoraDetalhePedido(dataCriacao)
    case 'preparo':
      return formatarHoraDetalhePedido(detalhesEntrega?.dataInicioPreparo)
    case 'pronto':
      return formatarHoraDetalhePedido(detalhesEntrega?.dataPronto)
    case 'em-rota':
      return formatarHoraDetalhePedido(detalhesEntrega?.dataSaidaEntrega)
    case 'previsao':
      return formatarHoraPrevisaoEntrega(detalhesEntrega?.previsaoEntrega, dataCriacao)
    default:
      return '—'
  }
}

export function PedidoKanbanProgressoEntrega({
  colunaAtual,
  dataCriacao,
  detalhesEntrega,
}: PedidoKanbanProgressoEntregaProps) {
  const indiceEtapaAtual = resolverIndiceEtapaColuna(colunaAtual)

  return (
    <div className="px-3 py-0.5">
      <div className="grid grid-cols-5 gap-0">
        {ETAPAS_PROGRESSO.map(etapa => (
          <span
            key={etapa.id}
            className="text-center text-[8px] font-normal leading-none text-secondary"
          >
            {etapa.label}
          </span>
        ))}
      </div>

      <div className="my-1 flex w-full items-center">
        {ETAPAS_PROGRESSO.map((etapa, index) => {
          const marcada = index <= indiceEtapaAtual
          const segmentoConcluido = index > 0 && index <= indiceEtapaAtual

          return (
            <Fragment key={etapa.id}>
              {index > 0 && (
                <div
                  className={`h-0.5 min-w-0 flex-1 ${
                    segmentoConcluido ? 'bg-secondary' : 'bg-gray-300'
                  }`}
                />
              )}
              <div
                className={`z-[1] h-2 w-2 shrink-0 rounded-full ${
                  marcada ? 'bg-secondary' : 'bg-gray-300'
                }`}
              />
            </Fragment>
          )
        })}
      </div>

      <div className="grid grid-cols-5 gap-0">
        {ETAPAS_PROGRESSO.map((etapa, index) => {
          const marcada = index <= indiceEtapaAtual
          const hora = obterHoraEtapa(etapa.id, dataCriacao, detalhesEntrega)
          const exibirHora =
            etapa.id === 'previsao' ? hora !== '—' : marcada && hora !== '—'

          return (
            <span
              key={etapa.id}
              className={`text-center text-[10px] tabular-nums leading-none ${
                exibirHora ? 'font-semibold text-alternate' : 'text-gray-400'
              }`}
            >
              {exibirHora ? hora : '—'}
            </span>
          )
        })}
      </div>
    </div>
  )
}
