'use client'

import type { Produto } from '@/src/domain/entities/Produto'
import type { ToggleField } from '@/src/shared/types/produto'
import { actionIconsConfig } from './constants'

/** Na lista de lote não exibimos copiar (já há fluxo próprio). */
const CHAVES_OCULTAS_LOTE = new Set(['copiar'])

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
 * Ícones da lista de produtos (somente leitura, sem copiar).
 * Mesmo visual da lista de `/produtos`: círculo roxo preenchido (ativo) ou contorno (inativo).
 */
export function ProdutoActionIconsDisplay({ produto }: { produto: Produto }) {
  const produtoId = produto.getId()

  return (
    <div
      className="flex flex-nowrap items-center gap-1"
      aria-label="Indicadores do produto"
    >
      {actionIconsConfig
        .filter(def => !CHAVES_OCULTAS_LOTE.has(def.key))
        .map(({ key, ariaLabel, Icon, field }) => {
          const ativo = field ? permissaoAtivaNoProduto(produto, field) : false

          return (
            <span
              key={`${produtoId}-${key}`}
              title={ariaLabel}
              aria-label={ariaLabel}
              aria-pressed={field ? ativo : undefined}
              className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[13px] ${
                ativo
                  ? 'border border-secondary bg-secondary text-white'
                  : 'border border-secondary/60 bg-white text-secondary'
              }`}
            >
              <Icon />
            </span>
          )
        })}
    </div>
  )
}
