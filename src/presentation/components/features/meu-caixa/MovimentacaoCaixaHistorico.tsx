'use client'

import type { MovimentacaoCaixaEstacaoDTO } from '@/src/application/dto/caixa-estacao/OperacaoCaixaEstacaoDTO'
import { useHistoricoMovimentacoesCaixaEstacao } from '@/src/presentation/components/features/meu-caixa/hooks/useHistoricoMovimentacoesCaixaEstacao'
import { cn } from '@/src/shared/utils/cn'

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}

function formatarData(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function MovimentacaoCaixaHistoricoItem({
  item,
  tipo,
}: {
  item: MovimentacaoCaixaEstacaoDTO
  tipo: 'suprimento' | 'sangria'
}) {
  return (
    <li className="rounded-lg bg-gray-50 px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-primary-text">
            {item.descricao?.trim() || '—'}
          </p>
          <p className="mt-0.5 text-[11px] text-secondary-text">
            {formatarData(item.dataCriacao)}
            {item.realizadoPorAtor?.nome ? ` · ${item.realizadoPorAtor.nome}` : ''}
          </p>
        </div>
        <p
          className={cn(
            'shrink-0 text-sm font-semibold tabular-nums',
            tipo === 'suprimento' ? 'text-emerald-600' : 'text-red-500'
          )}
        >
          {formatarMoeda(item.valor)}
        </p>
      </div>
    </li>
  )
}

export function MovimentacaoCaixaHistorico({
  tipo,
  estacaoId,
}: {
  tipo: 'suprimento' | 'sangria'
  estacaoId: string
}) {
  const apiTipo = tipo === 'suprimento' ? 'suprimentos' : 'sangrias'
  const historico = useHistoricoMovimentacoesCaixaEstacao(estacaoId, apiTipo)
  const itens = historico.data ?? []

  return (
    <div className="mt-5 border-t border-gray-100 pt-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary-text">
        Histórico deste caixa
        {!historico.isLoading && itens.length > 0 ? ` (${itens.length})` : ''}
      </p>
      {historico.isLoading ? (
        <p className="py-2 text-xs text-secondary-text">Carregando…</p>
      ) : historico.isError ? (
        <p className="text-xs text-error">Não foi possível carregar o histórico.</p>
      ) : itens.length === 0 ? (
        <p className="py-2 text-xs text-secondary-text">Nenhum registro ainda.</p>
      ) : (
        <ul className="max-h-44 space-y-2 overflow-y-auto overscroll-y-contain pr-0.5">
          {itens.map(item => (
            <MovimentacaoCaixaHistoricoItem key={item.id} item={item} tipo={tipo} />
          ))}
        </ul>
      )}
    </div>
  )
}
