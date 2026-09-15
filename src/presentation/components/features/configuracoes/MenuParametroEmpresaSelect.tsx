'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { MenuItem } from '@mui/material'
import { Input } from '@/src/presentation/components/ui/input'
import { useMenus } from '@/src/presentation/hooks/menus/useMenus'
import { useGestaoPath } from '@/src/presentation/hooks/useGestaoPath'
import type { Menu } from '@/src/shared/types/menus'

function rotuloMenu(menu: Menu): string {
  return menu.tipo === 'principal' ? `${menu.nome} (principal)` : menu.nome
}

export interface MenuParametroEmpresaSelectProps {
  id: string
  label: string
  description?: string
  value: string | null
  onChange: (menuId: string | null) => void
  disabled?: boolean
  /** Usa `Input` MUI outlined (aba Empresa); senão `<select>` nativo (aba Delivery). */
  variant?: 'mui' | 'native'
  sx?: Record<string, unknown>
}

export function MenuParametroEmpresaSelect({
  id,
  label,
  description,
  value,
  onChange,
  disabled = false,
  variant = 'native',
  sx,
}: MenuParametroEmpresaSelectProps) {
  const { toGestao } = useGestaoPath()
  const menusQuery = useMenus({ limit: 100 })

  const menusDisponiveis = useMemo(() => {
    const items = menusQuery.data?.items ?? []
    const ativos = items.filter(menu => menu.ativo)
    if (value && !ativos.some(menu => menu.id === value)) {
      const selecionado = items.find(menu => menu.id === value)
      if (selecionado) return [selecionado, ...ativos]
    }
    return ativos
  }, [value, menusQuery.data?.items])

  const selectDisabled = disabled || menusQuery.isPending

  const options = (
    <>
      <option value="">Selecione um cardápio</option>
      {menusDisponiveis.map(menu => (
        <option key={menu.id} value={menu.id}>
          {rotuloMenu(menu)}
          {menu.ativo ? '' : ' (inativo)'}
        </option>
      ))}
    </>
  )

  return (
    <div>
      {variant === 'native' ? (
        <label htmlFor={id} className="text-sm font-semibold text-primary-text">
          {label}
        </label>
      ) : null}
      {description ? (
        <p
          className={
            variant === 'native' ? 'mt-0.5 text-xs text-secondary-text' : 'text-xs text-secondary-text'
          }
        >
          {description}
        </p>
      ) : null}

      {variant === 'mui' ? (
        <Input
          id={id}
          select
          label={label}
          value={value ?? ''}
          onChange={e => onChange(e.target.value.trim() || null)}
          disabled={selectDisabled}
          size="small"
          sx={sx}
          InputLabelProps={{ shrink: true }}
          SelectProps={{ displayEmpty: true }}
          className="mt-2"
        >
          <MenuItem value="">
            <em>Selecione um cardápio</em>
          </MenuItem>
          {menusDisponiveis.map(menu => (
            <MenuItem key={menu.id} value={menu.id}>
              {rotuloMenu(menu)}
              {menu.ativo ? '' : ' (inativo)'}
            </MenuItem>
          ))}
        </Input>
      ) : (
        <select
          id={id}
          value={value ?? ''}
          disabled={selectDisabled}
          onChange={e => onChange(e.target.value.trim() || null)}
          className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-primary-text outline-none disabled:cursor-not-allowed disabled:opacity-60"
        >
          {options}
        </select>
      )}

      {menusQuery.isError ? (
        <p className="mt-1 text-xs text-red-600">
          Não foi possível carregar os menus.{' '}
          <button
            type="button"
            className="underline"
            onClick={() => void menusQuery.refetch()}
          >
            Tentar de novo
          </button>
        </p>
      ) : null}

      {!menusQuery.isPending && menusDisponiveis.length === 0 ? (
        <p className="mt-1 text-xs text-secondary-text">
          Nenhum menu ativo.{' '}
          <Link href={toGestao('/menus')} className="font-semibold text-secondary underline">
            Cadastrar cardápio
          </Link>
        </p>
      ) : null}
    </div>
  )
}
