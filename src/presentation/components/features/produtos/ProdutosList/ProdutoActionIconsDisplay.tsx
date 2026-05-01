'use client'

import type { ComponentType } from 'react'
import type { Produto } from '@/src/domain/entities/Produto'
import type { ToggleField } from '@/src/shared/types/produto'
import { actionIconsConfig } from './constants'

/** Na lista de lote não exibimos copiar, complementos nem impressoras (já há colunas próprias). */
const CHAVES_OCULTAS_LOTE = new Set(['copiar', 'complementos', 'impressora'])

function permissaoAtivaNoProduto(produto: Produto, field: ToggleField): boolean {
  switch (field) {
    case 'favorito':
      return produto.isFavorito()
    case 'permiteAcrescimo':
      return produto.permiteAcrescimoAtivo()
    case 'permiteDesconto':
      return produto.permiteDescontoAtivo()
    case 'abreComplementos':
      return produto.abreComplementosAtivo()
    case 'permiteAlterarPreco':
      return produto.permiteAlterarPrecoAtivo()
    case 'incideTaxa':
      return produto.incideTaxaAtivo()
  }
}

/**
 * Ícones da lista de produtos (actionIconsConfig), somente leitura, sem copiar/complementos/impressora.
 * Cores: ativo = primary-text; inativo = cinza médio.
 */
export function ProdutoActionIconsDisplay({ produto }: { produto: Produto }) {
  const produtoId = produto.getId()

  return (
    <div
      className="mt-1.5 flex flex-wrap items-center gap-1 md:gap-1.5"
      aria-label="Indicadores do produto"
    >
      {actionIconsConfig
        .filter((def) => !CHAVES_OCULTAS_LOTE.has(def.key))
        .map(({ key, label, Icon, field }) => {
        const IconEl = Icon as ComponentType<{ className?: string }>

        const ativo = field ? permissaoAtivaNoProduto(produto, field) : false

        const corIcone = ativo ? 'text-primary-text' : 'text-gray-500'

        return (
          <span
            key={`${produtoId}-${key}`}
            title={label}
            className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full md:h-7 md:w-7 ${corIcone}`}
          >
            <IconEl className="text-base md:text-lg" />
          </span>
        )
      })}
    </div>
  )
}
