'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo } from 'react'
import AppsIcon from '@mui/icons-material/Apps'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import SchoolIcon from '@mui/icons-material/School'
import { LogOut } from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/src/shared/utils/cn'
import { useAuthStore } from '@/src/presentation/stores/authStore'

type MenuItem = {
  label: string
  href: string
  /** Ícones Material (`@mui/icons-material`), mesma família que `AppsIcon`. */
  Icon: typeof AppsIcon
}

const MENU_ITEMS: MenuItem[] = [
  { label: 'Meus Aplicativos', href: '/meus-apps', Icon: AppsIcon },
  { label: 'Extrato Financeiro', href: '/meus-apps/extrato-financeiro', Icon: ReceiptLongIcon },
  { label: 'Treinamentos', href: '/meus-apps/treinamentos', Icon: SchoolIcon },
]

function isActivePath(pathname: string | null, href: string): boolean {
  if (!pathname) return false
  if (href === '/meus-apps') return pathname === '/meus-apps'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function MeusAppsTopNav() {
  const pathname = usePathname()
  const { getUser, logout } = useAuthStore()
  const user = getUser()

  const userLabel = useMemo(() => {
    const nome = user?.getName()?.trim()
    const email = user?.getEmail()?.trim()
    return nome || email || 'Usuário'
  }, [user])

  const userInitial = useMemo(() => {
    const t = userLabel.trim()
    return t ? t.charAt(0).toUpperCase() : 'U'
  }, [userLabel])

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-primary">
      <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center justify-between gap-3 px-2 md:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/meus-apps" className="flex items-center gap-2">
          <div className="relative w-14 h-14">
              <Image
                src="/images/jiffy-100x100.gif"
                alt="Jiffy"
                fill
                sizes="56px"
                className="object-contain"
              />
            </div>
            <span className="text-2xl font-semibold tracking-wide text-info">Jiffy</span>
            </Link>
            </div>
            <div className="flex items-center gap-2">
          <nav className="hidden min-w-0 items-center gap-6 md:flex" aria-label="Navegação do hub">
            {MENU_ITEMS.map(item => {
              const active = isActivePath(pathname, item.href)
              const Icon = item.Icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-regular transition',
                    active ? 'bg-white/10 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <Icon className="shrink-0" sx={{ fontSize: 20, color: 'inherit' }} aria-hidden />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 border-l border-white/90 px-3 py-1.5 text-white/90 md:flex">
            
            <span className="max-w-[220px] truncate text-sm font-normal">{userLabel}</span>
            <button
              type="button"
              onClick={() => {
                void (async () => {
                  try {
                    await logout()
                  } finally {
                    window.location.href = '/login'
                  }
                })()
              }}
              className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-white/90 transition hover:bg-white/10"
              aria-label="Sair"
              title="Sair"
            >
              <LogOut className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div className="md:hidden">
            <button
              type="button"
              onClick={() => {
                void (async () => {
                  try {
                    await logout()
                  } finally {
                    window.location.href = '/login'
                  }
                })()
              }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white transition hover:bg-white/15"
              aria-label="Sair"
              title="Sair"
            >
              {userInitial}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
