'use client'

import { useEffect, useMemo, useState } from 'react'
import type { MenuProduto, UpdateMenuProdutoInput } from '@/src/shared/types/menus'
import { menuQuickActionIconsConfig } from '@/src/presentation/components/features/produtos/ProdutosList/constants'
import { CatalogQuickActionButton } from '@/src/presentation/components/features/catalogo/CatalogQuickActionButton'
import {
  resolverPermissoesMenuProduto,
  type MenuProdutoPermissaoField,
  type MenuProdutoPermissoes,
} from '@/src/shared/utils/menuProdutoPermissoes'

export interface MenuProdutoRowQuickActionsProps {
  produto: MenuProduto
  disabled?: boolean
  /** Fallback do cadastro enquanto o snapshot do menu não traz as permissões. */
  permissoesCadastro?: Partial<MenuProdutoPermissoes> | null
  /** Retorna `false` se o usuário cancelar ou se o patch falhar. */
  onPatch: (
    produtoId: string,
    input: UpdateMenuProdutoInput
  ) => boolean | Promise<boolean>
  onTogglePermissao: (
    produtoId: string,
    field: MenuProdutoPermissaoField,
    value: boolean
  ) => boolean | Promise<boolean>
}

/** Ícones rápidos na lista do cardápio (favorito no snapshot; permissões prontas para o menu). */
export function MenuProdutoRowQuickActions({
  produto,
  disabled,
  permissoesCadastro,
  onPatch,
  onTogglePermissao,
}: MenuProdutoRowQuickActionsProps) {
  const [favorito, setFavorito] = useState(produto.favorito)
  const [permissoesOverride, setPermissoesOverride] = useState<
    Partial<MenuProdutoPermissoes>
  >({})

  useEffect(() => {
    setFavorito(produto.favorito)
  }, [produto.favorito])

  useEffect(() => {
    setPermissoesOverride({})
  }, [produto.produtoId, permissoesCadastro])

  const permissoes = useMemo(() => {
    const resolvidas = resolverPermissoesMenuProduto(produto, permissoesCadastro)
    return { ...resolvidas, ...permissoesOverride }
  }, [produto, permissoesCadastro, permissoesOverride])

  return (
    <div className="flex flex-nowrap items-center gap-2.5 md:gap-3">
      {menuQuickActionIconsConfig.map(def => {
        const isFavorito = def.field === 'favorito'
        const active = isFavorito
          ? favorito
          : permissoes[def.field as MenuProdutoPermissaoField]

        return (
          <CatalogQuickActionButton
            key={`${produto.produtoId}-${def.key}`}
            def={def}
            active={active}
            disabled={disabled}
            onClick={() => {
              if (isFavorito) {
                const next = !favorito
                void (async () => {
                  const ok = await onPatch(produto.produtoId, { favorito: next })
                  if (ok) setFavorito(next)
                })()
                return
              }

              const permissao = def.field as MenuProdutoPermissaoField
              const next = !permissoes[permissao]
              setPermissoesOverride(prev => ({ ...prev, [permissao]: next }))
              void (async () => {
                const ok = await onTogglePermissao(produto.produtoId, permissao, next)
                if (!ok) {
                  setPermissoesOverride(prev => ({ ...prev, [permissao]: !next }))
                }
              })()
            }}
          />
        )
      })}
    </div>
  )
}
