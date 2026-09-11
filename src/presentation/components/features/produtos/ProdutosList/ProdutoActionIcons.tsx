'use client'

import type { Produto } from '@/src/domain/entities/Produto'
import type { ToggleField } from '@/src/shared/types/produto'
import { actionIconsConfig, type ActionIconDef } from './constants'
import { CatalogQuickActionButton } from '@/src/presentation/components/features/catalogo/CatalogQuickActionButton'

interface ProdutoActionIconsProps {
  produto: Produto
  toggleStates: Record<ToggleField, boolean>
  onToggleBoolean: (produtoId: string, field: ToggleField, value: boolean) => void
  onCopyProduto: (produtoId: string) => void
}

export function ProdutoActionIcons({
  produto,
  toggleStates,
  onToggleBoolean,
  onCopyProduto,
}: ProdutoActionIconsProps) {
  const produtoId = produto.getId()

  const runAction = (def: ActionIconDef) => {
    if (def.field) {
      onToggleBoolean(produtoId, def.field, !toggleStates[def.field])
      return
    }
    if (def.action === 'copy') {
      onCopyProduto(produtoId)
    }
  }

  return (
    <div className="flex flex-nowrap items-center gap-2.5 md:gap-3">
      {actionIconsConfig.map(def => (
        <CatalogQuickActionButton
          key={`${produtoId}-${def.key}`}
          def={def}
          active={def.field ? toggleStates[def.field] : undefined}
          onClick={() => runAction(def)}
        />
      ))}
    </div>
  )
}
