'use client'

import Link from 'next/link'
import { useGestaoPath } from '@/src/presentation/hooks/useGestaoPath'
import { cn } from '@/src/shared/utils/cn'
import {
  menuCardapioPath,
  type MenuCardapioAba,
} from '@/src/shared/utils/menuCardapioAba'

const ABAS: Array<{ id: MenuCardapioAba; label: string }> = [
  { id: 'produtos', label: 'Produtos' },
  { id: 'categorias', label: 'Categorias' },
]

type Props = {
  menuId: string
  aba: MenuCardapioAba
}

export function MenuCardapioAbas({ menuId, aba }: Props) {
  const { toGestao } = useGestaoPath()

  return (
    <nav
      className="inline-flex h-8 shrink-0 items-center rounded-lg border border-primary/40 bg-white p-[3px]"
      aria-label="Seções deste menu"
    >
      {ABAS.map(item => {
        const ativa = item.id === aba
        return (
          <Link
            key={item.id}
            href={toGestao(menuCardapioPath(menuId, item.id))}
            className={cn(
              'flex h-full items-center rounded-md px-3 text-sm font-semibold leading-none transition-colors',
              ativa
                ? 'bg-primary text-white'
                : 'text-secondary-text hover:bg-primary/10 hover:text-primary'
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
