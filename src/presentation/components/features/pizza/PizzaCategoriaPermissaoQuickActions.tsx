'use client'

import { useEffect, useState } from 'react'
import { MdAddCircleOutline, MdRemoveCircleOutline } from 'react-icons/md'
import { CatalogQuickActionButton } from '@/src/presentation/components/features/catalogo/CatalogQuickActionButton'
import type { ActionIconDef } from '@/src/presentation/components/features/produtos/ProdutosList/constants'
import type { CategoriaPizza } from '@/src/shared/types/pizza'

export type PizzaCategoriaPermissaoField = 'permiteAcrescimo' | 'permiteDesconto'

const pizzaCategoriaPermissaoIcons: ActionIconDef[] = [
  {
    key: 'acrescentar',
    ariaLabel: 'Permitir acréscimo',
    headerLabel: 'Acrésc.',
    label:
      'Permite que o operador acrescente valor aos itens desta categoria de pizza no Jiffy POS.',
    Icon: MdAddCircleOutline,
    field: 'permiteAcrescimo',
  },
  {
    key: 'diminuir',
    ariaLabel: 'Permitir desconto',
    headerLabel: 'Desc.',
    label:
      'Permite aplicar desconto aos itens desta categoria de pizza no Jiffy POS, sem alterar o preço base.',
    Icon: MdRemoveCircleOutline,
    field: 'permiteDesconto',
  },
]

function valorPermissao(
  categoria: CategoriaPizza,
  field: PizzaCategoriaPermissaoField
): boolean {
  return categoria[field] ?? true
}

export interface PizzaCategoriaPermissaoQuickActionsProps {
  categoria: CategoriaPizza
  disabled?: boolean
  onToggle: (
    categoriaId: string,
    field: PizzaCategoriaPermissaoField,
    value: boolean
  ) => boolean | Promise<boolean>
}

/** Ícones de acréscimo/desconto no cabeçalho da categoria pizza (mesmo padrão do cardápio). */
export function PizzaCategoriaPermissaoQuickActions({
  categoria,
  disabled,
  onToggle,
}: PizzaCategoriaPermissaoQuickActionsProps) {
  const [override, setOverride] = useState<Partial<Record<PizzaCategoriaPermissaoField, boolean>>>(
    {}
  )

  useEffect(() => {
    setOverride({})
  }, [categoria.id, categoria.permiteAcrescimo, categoria.permiteDesconto])

  return (
    <div
      className="flex w-full flex-nowrap items-center justify-start gap-1 md:w-auto md:gap-3"
      onMouseDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
    >
      {pizzaCategoriaPermissaoIcons.map(def => {
        const field = def.field as PizzaCategoriaPermissaoField
        const active = override[field] ?? valorPermissao(categoria, field)

        return (
          <CatalogQuickActionButton
            key={`${categoria.id}-${def.key}`}
            def={def}
            active={active}
            disabled={disabled}
            onClick={() => {
              const next = !active
              setOverride(prev => ({ ...prev, [field]: next }))
              void (async () => {
                const ok = await onToggle(categoria.id, field, next)
                if (!ok) {
                  setOverride(prev => ({ ...prev, [field]: !next }))
                }
              })()
            }}
          />
        )
      })}
    </div>
  )
}
