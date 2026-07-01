'use client'

import type { Produto } from '@/src/domain/entities/Produto'
import { COLUNAS_FISCAL_GRID, valoresFiscaisProduto } from '../utils/fiscalLoteDisplay'
import type { FiscalInlineEditApi } from '../hooks/useFiscalInlineEdit'
import { LoteFiscalCelulaEditavel } from './LoteFiscalCelulaEditavel'

/** Colunas fiscais na linha da grid (desktop) — edição inline por célula. */
export function LoteFiscalColunasProduto({
  produto,
  fiscalInline,
}: {
  produto: Produto
  fiscalInline: FiscalInlineEditApi
}) {
  const v = valoresFiscaisProduto(produto)

  const valores = [v.ncm, v.cest, v.origem, v.tipo, v.indicador] as const

  return (
    <>
      {COLUNAS_FISCAL_GRID.map((col, index) => (
        <LoteFiscalCelulaEditavel
          key={col.id}
          produto={produto}
          coluna={col.id}
          className={col.className}
          textoExibicao={valores[index].texto}
          tituloExibicao={valores[index].titulo}
          fiscalInline={fiscalInline}
          layout="grid"
        />
      ))}
    </>
  )
}

/** Detalhes fiscais no painel expandido (mobile) — edição inline. */
export function LoteFiscalDetalhesMobile({
  produto,
  fiscalInline,
}: {
  produto: Produto
  fiscalInline: FiscalInlineEditApi
}) {
  const v = valoresFiscaisProduto(produto)

  const linhas = [
    { coluna: 'ncm' as const, label: 'NCM', ...v.ncm },
    { coluna: 'cest' as const, label: 'CEST', ...v.cest },
    { coluna: 'origem' as const, label: 'Origem', ...v.origem },
    { coluna: 'tipo' as const, label: 'Tipo', ...v.tipo },
    { coluna: 'indicador' as const, label: 'Ind. Produção em Escala', ...v.indicador },
  ]

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-2">
      {linhas.map(({ coluna, texto, titulo }) => (
        <LoteFiscalCelulaEditavel
          key={coluna}
          produto={produto}
          coluna={coluna}
          className=""
          textoExibicao={texto}
          tituloExibicao={titulo}
          fiscalInline={fiscalInline}
          layout="mobile"
        />
      ))}
    </div>
  )
}
