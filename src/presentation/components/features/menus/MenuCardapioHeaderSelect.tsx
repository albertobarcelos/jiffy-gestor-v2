'use client'

import { useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Tooltip } from '@mui/material'
import { MdSettings } from 'react-icons/md'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/src/presentation/components/ui/select'
import { useGestaoPath } from '@/src/presentation/hooks/useGestaoPath'
import { useMenus } from '@/src/presentation/hooks/menus/useMenus'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { gravarMenuCardapioSessao } from '@/src/shared/utils/menuCardapioSessao'
import { menuCardapioPath, type MenuCardapioAba } from '@/src/shared/utils/menuCardapioAba'

type Props = {
  menuId: string
  nomeMenu: string
  aba?: MenuCardapioAba
}

function isPrincipal(tipo: string | undefined): boolean {
  return String(tipo ?? '').toLowerCase() === 'principal'
}

export function MenuCardapioHeaderSelect({ menuId, nomeMenu, aba = 'produtos' }: Props) {
  const router = useRouter()
  const { toGestao } = useGestaoPath()
  const empresaId = useTenantEmpresaId()
  const { data } = useMenus({ limit: 100 })
  const menusCarregados = data?.items ?? []

  const menus = useMemo(() => {
    const lista = menusCarregados.length > 0 ? menusCarregados : [{ id: menuId, nome: nomeMenu, tipo: '' }]
    return [...lista].sort((a, b) => {
      const aPrincipal = isPrincipal(String(a.tipo)) ? 0 : 1
      const bPrincipal = isPrincipal(String(b.tipo)) ? 0 : 1
      if (aPrincipal !== bPrincipal) return aPrincipal - bPrincipal
      return a.nome.localeCompare(b.nome, 'pt-BR')
    })
  }, [menuId, menusCarregados, nomeMenu])

  const menuAtual = menus.find(m => m.id === menuId)
  const nomeExibido = menuAtual?.nome ?? nomeMenu
  const mostrarSeloPrincipal =
    isPrincipal(String(menuAtual?.tipo)) &&
    !nomeExibido.toLocaleLowerCase('pt-BR').includes('principal')

  useEffect(() => {
    if (!empresaId || !menuId) return
    gravarMenuCardapioSessao(empresaId, menuId)
  }, [empresaId, menuId])

  return (
    <div className="flex h-8 min-w-0 items-center gap-2">
      <span className="shrink-0 text-sm font-semibold text-primary">Menu</span>
      <Select
        value={menuId}
        onValueChange={id => {
          if (!id || id === menuId) return
          if (empresaId) gravarMenuCardapioSessao(empresaId, id)
          router.push(toGestao(menuCardapioPath(id, aba)))
        }}
      >
        <SelectTrigger
          aria-label="Selecionar menu"
          className="!h-8 !min-h-8 !w-auto max-w-[14rem] !rounded-none !border-0 !bg-transparent !px-0 !py-0 text-base font-medium text-tertiary shadow-none focus:!ring-0 focus:!ring-offset-0 md:max-w-[18rem]"
        >
          <span className="truncate">{nomeExibido}</span>
        </SelectTrigger>
        <SelectContent>
          {menus.map(menu => (
            <SelectItem key={menu.id} value={menu.id}>
              {menu.nome}
              {isPrincipal(String(menu.tipo)) ? ' (Principal)' : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {mostrarSeloPrincipal ? (
        <span className="hidden shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary sm:inline">
          Principal
        </span>
      ) : null}
      <Tooltip title="Gerenciar menus" arrow placement="top">
        <span className="inline-flex">
          <Link
            href={toGestao('/menus')}
            aria-label="Gerenciar menus"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-secondary-text transition-colors hover:bg-primary/10 hover:text-primary"
          >
            <MdSettings size={18} />
          </Link>
        </span>
      </Tooltip>
    </div>
  )
}
