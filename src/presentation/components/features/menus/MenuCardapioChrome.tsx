'use client'

import type { ReactNode } from 'react'
import { MenuCardapioAbas } from './MenuCardapioAbas'
import { MenuCardapioHeaderSelect } from './MenuCardapioHeaderSelect'
import type { MenuCardapioAba } from '@/src/shared/utils/menuCardapioAba'

type Props = {
  menuId: string
  nomeMenu: string
  aba: MenuCardapioAba
  toolbar?: ReactNode
  children: ReactNode
}

export function MenuCardapioChrome({ menuId, nomeMenu, aba, toolbar, children }: Props) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-shrink-0 px-1 py-1.5 md:px-[30px]">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 md:flex-nowrap md:pl-5">
          <MenuCardapioHeaderSelect menuId={menuId} nomeMenu={nomeMenu} aba={aba} />
          <div className="hidden h-5 w-px shrink-0 bg-primary/25 md:block" aria-hidden />
          <MenuCardapioAbas menuId={menuId} aba={aba} />
          <div className="ml-auto flex h-8 min-w-0 shrink-0 items-center">{toolbar}</div>
        </div>
      </div>
      <div className="h-[4px] flex-shrink-0 border-t-2 border-primary/50" />
      {children}
    </div>
  )
}
