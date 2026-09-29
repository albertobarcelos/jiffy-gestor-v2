'use client'

import { cn } from '@/src/shared/utils/cn'
import type { NcmCestFiscalLeitura } from '@/src/domain/policies/produto/ncmCestDoBlocoFiscal'

export const COLUNA_NCM_DETALHE_CLASS = 'w-[92px] shrink-0'
export const COLUNA_CEST_DETALHE_CLASS = 'w-[92px] shrink-0'

export function rotulosNcmCestFiscal(
  fiscal: NcmCestFiscalLeitura | undefined,
  carregando: boolean
): { ncm: string; cest: string; ncmVazio: boolean; cestVazio: boolean; indisponivel: boolean } {
  if (fiscal?.indisponivel) {
    return { ncm: '—', cest: '—', ncmVazio: true, cestVazio: true, indisponivel: true }
  }
  const ncm = fiscal?.ncm?.trim() ?? ''
  const cest = fiscal?.cest?.trim() ?? ''
  if (carregando && !ncm && !cest) {
    return { ncm: '…', cest: '…', ncmVazio: true, cestVazio: true, indisponivel: false }
  }
  return {
    ncm: ncm || 'SEM NCM',
    cest: cest || 'SEM CEST',
    ncmVazio: !ncm,
    cestVazio: !cest,
    indisponivel: false,
  }
}

export function PedidoDetalheColunaFiscal({
  texto,
  vazio,
  indisponivel = false,
  className,
}: {
  texto: string
  vazio: boolean
  indisponivel?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        'block truncate text-center text-xs tabular-nums',
        indisponivel
          ? 'text-gray-400'
          : vazio
            ? 'font-medium text-amber-700'
            : 'text-gray-900',
        className
      )}
      title={indisponivel ? 'Fiscal indisponível' : undefined}
    >
      {texto}
    </span>
  )
}
