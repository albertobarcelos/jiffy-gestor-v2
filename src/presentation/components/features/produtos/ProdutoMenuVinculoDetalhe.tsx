'use client'

import { formatarMoeda } from '@/src/presentation/components/features/dashboard/dashboardTextHelpers'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { useMenuProduto } from '@/src/presentation/hooks/menus/useMenuProduto'
import { cn } from '@/src/shared/utils/cn'

interface ProdutoMenuVinculoDetalheProps {
  menuId: string
  produtoId: string
  enabled: boolean
}

function DetailRow({
  label,
  value,
  multiline = false,
}: {
  label: string
  value: string
  multiline?: boolean
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-wide text-secondary-text">{label}</p>
      <p
        className={cn(
          'text-xs text-primary-text md:text-sm',
          multiline ? 'whitespace-pre-wrap break-words' : 'truncate'
        )}
      >
        {value}
      </p>
    </div>
  )
}

/**
 * Detalhes somente leitura do snapshot do produto em um menu (carrega ao expandir).
 */
export function ProdutoMenuVinculoDetalhe({
  menuId,
  produtoId,
  enabled,
}: ProdutoMenuVinculoDetalheProps) {
  const { data, isLoading, isError, error, refetch, isFetching } = useMenuProduto(
    menuId,
    produtoId,
    enabled
  )

  if (!enabled) return null

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <JiffyLoading />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="space-y-2 px-1 py-3 text-xs text-secondary-text">
        <p>{error?.message || 'Não foi possível carregar os dados deste cardápio.'}</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="font-semibold text-primary hover:underline"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  const complementos =
    (data.gruposComplementos ?? [])
      .map(g => g.nome)
      .filter(Boolean)
      .join(', ') || 'Nenhum'
  const status = [
    data.ativo ? 'Ativo' : 'Inativo',
    data.favorito ? 'Favorito' : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="relative space-y-3 border-t border-gray-200/80 px-1 py-3">
      {isFetching ? (
        <div className="absolute right-1 top-2 text-[10px] text-secondary-text">Atualizando…</div>
      ) : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DetailRow label="Nome no cardápio" value={data.nome || '—'} />
        <DetailRow label="Preço" value={formatarMoeda(Number(data.valor) || 0)} />
        <DetailRow label="Categoria" value={data.grupoProduto?.nome || '—'} />
        <DetailRow label="Status" value={status || '—'} />
      </div>
      {data.descricao ? (
        <DetailRow label="Descrição" value={data.descricao} multiline />
      ) : null}
      <DetailRow label="Grupos de complementos" value={complementos} multiline />
    </div>
  )
}
