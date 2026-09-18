'use client'

import { MdChevronRight } from 'react-icons/md'
import CircularProgress from '@mui/material/CircularProgress'
import { Button } from '@/src/presentation/components/ui/button'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import {
  COLUNAS_ENTREGA_OPERACIONAIS,
  rotuloBotaoAvancarEtapaKanban,
} from '@/src/presentation/components/features/kanban/rules/vendasKanban.rules'
import { linhaIdentificacaoVendaKanban } from '@/src/presentation/components/features/kanban/utils/kanbanVendaCardViewModel'
import type { ColunaKanbanId, KanbanColumn, Venda } from '@/src/presentation/components/features/kanban/types'

export function horaPedidoHoje(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

type Props = {
  venda: Venda
  coluna: KanbanColumn
  avancando: boolean
  onAbrir: (venda: Venda) => void
  onAvancar: (venda: Venda, colunaId: ColunaKanbanId) => void
}

export function WhatsAppPedidoHojeResumoCard({
  venda,
  coluna,
  avancando,
  onAbrir,
  onAvancar,
}: Props) {
  const etapa = coluna.id as ColunaKanbanId
  const podeAvancar = COLUNAS_ENTREGA_OPERACIONAIS.includes(etapa)
  const avancar = rotuloBotaoAvancarEtapaKanban(etapa, venda.tipoVenda)

  return (
    <article className={`overflow-hidden rounded-xl border ${coluna.borderColor} ${coluna.color}`}>
      <button
        type="button"
        onClick={() => onAbrir(venda)}
        className="flex w-full items-start gap-2 px-2.5 py-2 text-left"
      >
        <span className="mt-0.5 shrink-0 text-primary-text">{coluna.icon}</span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-[11px] font-semibold text-primary-text">{coluna.title}</span>
            <span className="shrink-0 text-[11px] text-secondary-text">{horaPedidoHoje(venda.dataCriacao)}</span>
          </span>
          <span className="mt-0.5 block truncate text-sm font-semibold text-primary-text">
            {linhaIdentificacaoVendaKanban(venda)}
          </span>
          <span className="block text-xs text-secondary-text">{transformarParaReal(venda.valorFinal)}</span>
        </span>
        <MdChevronRight className="mt-1 shrink-0 text-secondary-text" size={18} aria-hidden />
      </button>
      {podeAvancar ? (
        <div className="border-t border-black/5 bg-white/80 px-2.5 py-1.5">
          <Button
            type="button"
            size="small"
            className="w-full !normal-case"
            disabled={avancando}
            onClick={() => onAvancar(venda, etapa)}
          >
            {avancando ? (
              <span className="inline-flex items-center gap-1">
                <CircularProgress size={12} color="inherit" />
                {avancar.loading}
              </span>
            ) : (
              avancar.label
            )}
          </Button>
        </div>
      ) : null}
    </article>
  )
}
