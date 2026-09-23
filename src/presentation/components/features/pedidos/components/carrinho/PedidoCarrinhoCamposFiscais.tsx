'use client'

import Tooltip from '@mui/material/Tooltip'

type PedidoCarrinhoFiscalSobNomeProps = {
  ncm?: string
  cest?: string
}

/** Exibe NCM/CEST sob o nome do produto (somente leitura), com tooltip no hover. */
export function PedidoCarrinhoFiscalSobNome({ ncm, cest }: PedidoCarrinhoFiscalSobNomeProps) {
  const ncmTrim = ncm?.trim() || ''
  const cestTrim = cest?.trim() || ''

  if (!ncmTrim && !cestTrim) {
    return (
      <Tooltip title="Não tem NCM e CEST" enterDelay={300} arrow>
        <span className="mt-0.5 block w-fit max-w-full truncate text-[10px] leading-tight tabular-nums text-gray-500">
          -
        </span>
      </Tooltip>
    )
  }

  return (
    <span className="mt-0.5 flex min-w-0 items-baseline gap-1 truncate text-[10px] leading-tight tabular-nums text-gray-500">
      <Tooltip title={ncmTrim ? 'NCM' : 'Não tem NCM'} enterDelay={300} arrow>
        <span className="shrink-0">{ncmTrim || '-'}</span>
      </Tooltip>
      <span className="shrink-0" aria-hidden>
        ·
      </span>
      <Tooltip title={cestTrim ? 'CEST' : 'Não tem CEST'} enterDelay={300} arrow>
        <span className="min-w-0 truncate">{cestTrim || '-'}</span>
      </Tooltip>
    </span>
  )
}
