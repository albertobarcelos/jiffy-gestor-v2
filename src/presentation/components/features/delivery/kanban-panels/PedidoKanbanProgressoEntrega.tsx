'use client'

import { formatarHoraDetalhePedido, formatarHoraPrevisaoEntrega } from '@/src/application/mappers/PedidoDisplayMapper'
import type { DetalhesEntregaPedido } from '@/src/domain/types/vendaDetalhe'
import { COLUNAS_ENTREGA_OPERACIONAIS } from '@/src/presentation/components/features/kanban/rules/vendasKanban.rules'
import type { ColunaKanbanId } from '@/src/presentation/components/features/kanban/types'

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
  const ultimoIndice = ETAPAS_PROGRESSO.length - 1
  const faixaPreenchidaPct =
    indiceEtapaAtual <= 0 ? 0 : (indiceEtapaAtual / ultimoIndice) * 80

  return (
    <div className="px-1 py-0.5">
      <div className="grid grid-cols-5">
        {ETAPAS_PROGRESSO.map(etapa => (
          <span
            key={etapa.id}
            className="px-0.5 text-center text-[8px] font-normal leading-tight text-secondary"
          >
            {etapa.label}
          </span>
        ))}
      </div>

      <div className="relative my-1.5">
        <div className="absolute left-[10%] right-[10%] top-1/2 h-0.5 -translate-y-1/2 bg-gray-300" />
        <div
          className="absolute left-[10%] top-1/2 h-0.5 -translate-y-1/2 bg-secondary"
          style={{ width: `${faixaPreenchidaPct}%` }}
        />
        <div className="relative z-[1] grid grid-cols-5">
          {ETAPAS_PROGRESSO.map((etapa, index) => {
            const marcada = index <= indiceEtapaAtual
            return (
              <div key={etapa.id} className="flex justify-center">
                <div
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    marcada ? 'bg-secondary' : 'bg-gray-300'
                  }`}
                />
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-5">
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
