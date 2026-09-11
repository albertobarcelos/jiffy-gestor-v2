'use client'

import type { Produto } from '@/src/domain/entities/Produto'
import { menuQuickActionIconsConfig } from './constants'
import { toggleStatesFromProduto } from './toggleStatesFromProduto'

/**
 * Ícones da lista de lote (somente leitura, sem copiar).
 * Mesmo visual da lista de `/produtos`.
 */
export function ProdutoActionIconsDisplay({ produto }: { produto: Produto }) {
  const produtoId = produto.getId()
  const toggleStates = toggleStatesFromProduto(produto)

  return (
    <div
      className="flex flex-nowrap items-center gap-1"
      aria-label="Indicadores do produto"
    >
      {menuQuickActionIconsConfig.map(({ key, ariaLabel, Icon, field }) => {
        const ativo = toggleStates[field]
        return (
          <span
            key={`${produtoId}-${key}`}
            title={ariaLabel}
            aria-label={ariaLabel}
            aria-pressed={ativo}
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
