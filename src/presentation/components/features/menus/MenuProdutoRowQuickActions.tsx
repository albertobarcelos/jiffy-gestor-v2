'use client'

import { useEffect, useMemo, useState, type MouseEvent, type ReactNode } from 'react'
import { Tooltip } from '@mui/material'
import { MdStar, MdStarBorder } from 'react-icons/md'
import { cn } from '@/src/shared/utils/cn'
import type { MenuProduto, UpdateMenuProdutoInput } from '@/src/shared/types/menus'
import type { ToggleField } from '@/src/shared/types/produto'
import {
  permissionActionIconsConfig,
  type ActionIconDef,
} from '@/src/presentation/components/features/produtos/ProdutosList/constants'

const ROW_ICON_BTN =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-secondary/60 bg-white text-secondary transition-colors hover:bg-secondary/10'

export type BasePermissaoField = Exclude<ToggleField, 'favorito'>

function RowIconButton({
  title,
  active,
  onClick,
  disabled,
  children,
}: {
  title: string
  active?: boolean
  onClick: (e: MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <Tooltip title={title} arrow placement="top">
      <button
        type="button"
        disabled={disabled}
        onClick={e => {
          e.stopPropagation()
          onClick(e)
        }}
        className={cn(
          ROW_ICON_BTN,
          active && 'border-secondary bg-secondary text-white hover:bg-secondary',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        {children}
      </button>
    </Tooltip>
  )
}

function estadosPermissaoVazios(): Record<BasePermissaoField, boolean> {
  return {
    permiteAcrescimo: false,
    permiteDesconto: false,
    abreComplementos: false,
    permiteAlterarPreco: false,
    incideTaxa: false,
  }
}

export interface MenuProdutoRowQuickActionsProps {
  produto: MenuProduto
  disabled?: boolean
  /** Retorna `false` se o usuário cancelar ou se o patch falhar. */
  onPatch: (
    produtoId: string,
    input: UpdateMenuProdutoInput
  ) => boolean | Promise<boolean>
  /**
   * Com 1 menu: exibe só os ícones de permissão do cadastro base
   * (acréscimo, desconto, abrir complementos, preço, taxa).
   */
  showBasePermissoes?: boolean
  baseToggleStates?: Record<BasePermissaoField, boolean> | null
  onToggleBasePermissao?: (field: BasePermissaoField, value: boolean) => void
}

/** Ícones rápidos na lista do cardápio. */
export function MenuProdutoRowQuickActions({
  produto,
  disabled,
  onPatch,
  showBasePermissoes = false,
  baseToggleStates = null,
  onToggleBasePermissao,
}: MenuProdutoRowQuickActionsProps) {
  const [favorito, setFavorito] = useState(produto.favorito)
  const [permissoesOverride, setPermissoesOverride] = useState<
    Partial<Record<BasePermissaoField, boolean>>
  >({})

  useEffect(() => {
    setFavorito(produto.favorito)
  }, [produto.favorito])

  useEffect(() => {
    setPermissoesOverride({})
  }, [produto.produtoId])

  const permissoes = useMemo(() => {
    const base = baseToggleStates ?? estadosPermissaoVazios()
    return { ...base, ...permissoesOverride }
  }, [baseToggleStates, permissoesOverride])

  const handleTogglePermissao = (def: Extract<ActionIconDef, { field: ToggleField }>) => {
    const field = def.field as BasePermissaoField
    const next = !permissoes[field]
    setPermissoesOverride(prev => ({ ...prev, [field]: next }))
    onToggleBasePermissao?.(field, next)
  }

  if (showBasePermissoes) {
    return (
      <div className="flex shrink-0 flex-nowrap items-center gap-1">
        {permissionActionIconsConfig.map(def => {
          const Icon = def.Icon
          const active = permissoes[def.field as BasePermissaoField]
          return (
            <RowIconButton
              key={`${produto.produtoId}-${def.key}`}
              title={def.label}
              active={active}
              disabled={disabled || !onToggleBasePermissao}
              onClick={() => handleTogglePermissao(def)}
            >
              <Icon className="h-[1.05em] w-[1.05em] text-lg" />
            </RowIconButton>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex shrink-0 flex-nowrap items-center gap-1">
      <RowIconButton
        title={favorito ? 'Remover dos favoritos' : 'Marcar como favorito'}
        active={favorito}
        disabled={disabled}
        onClick={() => {
          const next = !favorito
          void (async () => {
            const ok = await onPatch(produto.produtoId, { favorito: next })
            if (ok) setFavorito(next)
          })()
        }}
      >
        {favorito ? <MdStar className="text-lg" /> : <MdStarBorder className="text-lg" />}
      </RowIconButton>
    </div>
  )
}
