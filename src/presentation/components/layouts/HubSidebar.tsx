'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import { LogOut } from 'lucide-react'
import { cn } from '@/src/shared/utils/cn'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { disconnectHubTab } from '@/src/presentation/utils/disconnectHubTab'
import { HUB_MENU_ITEMS, isHubMenuActive } from './hubNavigation'

type HubSidebarProps = {
  mobileOpen: boolean
  onMobileClose: () => void
}

export function HubSidebar({ mobileOpen, onMobileClose }: HubSidebarProps) {
  const pathname = usePathname()
  const { logoutHub } = useAuthStore()

  const handleLogout = () => {
    onMobileClose()
    void disconnectHubTab({ logoutHub })
  }

  const navContent = (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-center px-4 pb-2 pt-5">
        <Link href="/meus-apps" className="relative h-28 w-28" onClick={onMobileClose}>
          <Image src="/images/jiffy-acenando.png" alt="Jiffy" fill sizes="112px" className="object-contain" />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Navegação do hub">
        {HUB_MENU_ITEMS.map(item => {
          const active = isHubMenuActive(pathname, item.href)
          const Icon = item.Icon
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                active
                  ? 'bg-white text-[var(--color-primary)] shadow-sm'
                  : 'text-white/90 hover:bg-white/10 hover:text-white'
              )}
            >
              <Icon className="shrink-0" sx={{ fontSize: 22, color: 'inherit' }} aria-hidden />
              <span>{item.label}</span>
            </Link>
          )
        })}

        <Link
          href="/perfil"
          onClick={onMobileClose}
          className={cn(
            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
            isHubMenuActive(pathname, '/perfil')
              ? 'bg-white text-[var(--color-primary)] shadow-sm'
              : 'text-white/90 hover:bg-white/10 hover:text-white'
          )}
        >
          <AccountCircleIcon className="shrink-0" sx={{ fontSize: 22, color: 'inherit' }} aria-hidden />
          <span>Meu perfil</span>
        </Link>
      </nav>

      <div className="shrink-0 border-t border-white/20 p-3">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/90 transition hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-5 w-5 shrink-0" aria-hidden />
          <span>Sair</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop */}
      <aside
        className="hidden w-[240px] shrink-0 md:flex md:flex-col"
        style={{
          background: 'var(--color-primary)',
        }}
        aria-label="Menu lateral"
      >
        {navContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          aria-label="Fechar menu"
          onClick={onMobileClose}
        />
      ) : null}

      {/* Mobile drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[min(280px,85vw)] flex-col shadow-xl transition-transform duration-300 md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{
          background: 'linear-gradient(180deg, var(--color-primary) 0%, var(--color-secondary-background) 100%)',
        }}
        aria-label="Menu lateral"
        aria-hidden={!mobileOpen}
      >
        {navContent}
      </aside>
    </>
  )
}
