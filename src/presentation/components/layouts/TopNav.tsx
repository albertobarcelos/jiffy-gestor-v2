'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useQueryClient } from '@tanstack/react-query'
import { usePrefetch } from '@/src/presentation/hooks/usePrefetch'
import { MdDashboard, MdInventory, MdPointOfSale, MdAssessment, MdSettings, MdLogout, MdExpandMore, MdChevronRight } from 'react-icons/md'
import { 
  MdInventory2, 
  MdShoppingBag, 
  MdPeople, 
  MdPerson, 
  MdGroup, 
  MdPrint, 
  MdPayment,
  MdCategory,
  MdAddCircle,
  MdReceipt
} from 'react-icons/md'

/**
 * Navegação superior minimalista e clean
 * Design inspirado em sistemas POS modernos
 */
export function TopNav() {
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set())
  const pathname = usePathname()
  const router = useRouter()
  const { logout, getUser } = useAuthStore()
  const queryClient = useQueryClient()
  // const { prefetchRoute } = usePrefetch() // prefetchRoute não existe mais
  const menuRef = useRef<HTMLDivElement>(null)
  
  // Estado para controlar hidratação (evita hydration mismatch)
  const [isHydrated, setIsHydrated] = useState(false)
  
  // Obter dados do usuário
  const user = getUser()

  // Marcar como hidratado apenas no cliente
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // Prefetch agressivo das rotas mais acessadas na inicialização
  useEffect(() => {
    const routesToPrefetch = [
      '/cadastros/grupos-complementos',
      '/cadastros/complementos',
      '/produtos',
      '/cadastros/grupos-produtos',
      '/estoque',
      '/fiscal-flow',
    ]
    
    // Prefetch com delay para não bloquear a renderização inicial
    const timer = setTimeout(() => {
      routesToPrefetch.forEach((route) => {
        router.prefetch(route)
        // prefetchRoute(route)
      })
    }, 100)

    return () => clearTimeout(timer)
  }, [router])

  // Prefetch de rota E dados ao hover
  const handleLinkHover = useCallback(
    (path: string) => {
      if (path && path !== '#') {
        // Prefetch da rota do Next.js
        router.prefetch(path)
        // Prefetch dos dados do React Query
        // prefetchRoute(path)
      }
    },
    [router]
  )

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setExpandedMenus(new Set())
      }
    }

    if (expandedMenus.size > 0) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [expandedMenus])

  // Fechar dropdown ao mudar de rota
  useEffect(() => {
    setExpandedMenus(new Set())
  }, [pathname])

  const toggleMenu = useCallback(
    (menuName: string) => {
      const newExpanded = new Set(expandedMenus)
      if (newExpanded.has(menuName)) {
        newExpanded.delete(menuName)
      } else {
        // Fechar outros menus ao abrir um novo
        newExpanded.clear()
        newExpanded.add(menuName)
        // Quando expandir "Cadastros", prefetch das rotas mais acessadas
        if (menuName === 'Cadastros') {
          // prefetchRoute('/cadastros/grupos-complementos')
          // prefetchRoute('/cadastros/complementos')
          // prefetchRoute('/produtos')
          // prefetchRoute('/cadastros/grupos-produtos')
        }
      }
      setExpandedMenus(newExpanded)
    },
    [expandedMenus]
  )

  const menuItems = [
    { 
      name: 'Dashboard', 
      path: '/dashboard', 
      icon: MdDashboard 
    },
    {
      name: 'Cadastros',
      path: '#',
      icon: MdInventory2,
      children: [
        { name: 'Grupo Produtos', path: '/cadastros/grupos-produtos', icon: MdCategory },
        { name: 'Produtos', path: '/produtos', icon: MdShoppingBag },
        { name: 'Grupo Complementos', path: '/cadastros/grupos-complementos', icon: MdCategory },
        { name: 'Complementos', path: '/cadastros/complementos', icon: MdAddCircle },
        { name: 'Usuários', path: '/cadastros/usuarios', icon: MdPerson },
        { name: 'Perfis de Usuários', path: '/cadastros/perfis-usuarios-pdv', icon: MdGroup },
        { name: 'Clientes', path: '/cadastros/clientes', icon: MdPeople },
        { name: 'Impressoras', path: '/cadastros/impressoras', icon: MdPrint },
        { name: 'Meios de Pagamentos', path: '/cadastros/meios-pagamentos', icon: MdPayment },
      ],
    },
    { name: 'Estoque', path: '/estoque', icon: MdInventory },
    { name: 'Meu Caixa', path: '/meu-caixa', icon: MdPointOfSale },
    { name: 'Fiscal Flow', path: '/fiscal-flow', icon: MdReceipt },
    { name: 'Relatórios', path: '/relatorios', icon: MdAssessment },
    { name: 'Configurações', path: '/configuracoes', icon: MdSettings },
  ]

  const isMenuActive = (item: typeof menuItems[0]) => {
    if (item.path !== '#') {
      return pathname === item.path || pathname?.startsWith(item.path + '/')
    }
    if (item.children) {
      return item.children.some((child) => pathname === child.path || pathname?.startsWith(child.path + '/'))
    }
    return false
  }

  const isChildActive = (childPath: string) => {
    return pathname === childPath || pathname?.startsWith(childPath + '/')
  }

  return (
    <nav className="h-16 bg-white border-b border-gray-200 shadow-sm">
      <div className="h-full flex items-center justify-between px-4">
        {/* Logo */}
        <div className="flex items-center">
          <Link href="/dashboard" className="flex items-center">
            <div className="relative w-12 h-12 sm:w-20 sm:h-14">
              <Image
                src="/images/jiffy-head.png"
                alt="Jiffy"
                fill
                sizes="(max-width: 640px) 176px, 208px"
                className="object-contain"
                priority
              />
            </div>
          </Link>
        </div>

        {/* Menu Items */}
        <div ref={menuRef} className="flex-1 flex items-center justify-start gap-1 pl-2">
          {menuItems.map((item) => {
            const isActive = isMenuActive(item)
            const isExpanded = expandedMenus.has(item.name)
            const Icon = item.icon

            if (item.children) {
              return (
                <div key={item.name} className="relative group">
                  <button
                    onClick={() => toggleMenu(item.name)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                    <MdExpandMore 
                      className={`w-4 h-4 transition-transform duration-200 ${
                        isExpanded ? 'rotate-180' : ''
                      }`} 
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {isExpanded && (
                    <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                      {item.children.map((child) => {
                        const ChildIcon = child.icon
                        const childIsActive = isChildActive(child.path)
                        return (
                          <Link
                            key={child.path}
                            href={child.path}
                            onMouseEnter={() => handleLinkHover(child.path)}
                            onClick={() => setExpandedMenus(new Set())}
                            prefetch={true}
                            className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                              childIsActive
                                ? 'bg-gray-50 text-gray-900 font-medium'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <ChildIcon className="w-4 h-4" />
                            <span>{child.name}</span>
                            {childIsActive && (
                              <MdChevronRight className="w-4 h-4 ml-auto text-gray-400" />
                            )}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }

            return (
              <Link
                key={item.path}
                href={item.path}
                onMouseEnter={() => handleLinkHover(item.path)}
                prefetch={true}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </div>

        {/* User Actions */}
        <div className="flex items-center gap-3">
          {/* Search Icon */}
          <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          {/* Notifications */}
          <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* User Profile - Agora clicável */}
          <Link
            href="/perfil"
            onMouseEnter={() => handleLinkHover('/perfil')}
            className="flex items-center gap-2 pl-3 border-l border-gray-200 hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center">
              <span className="text-xs font-semibold text-white">
                {isHydrated
                  ? user?.getName()?.charAt(0).toUpperCase() || user?.getEmail()?.charAt(0).toUpperCase() || 'U'
                  : 'U'}
              </span>
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium text-gray-900">
                {isHydrated ? user?.getName() || user?.getEmail() || 'Usuário' : 'Usuário'}
              </p>
              <p className="text-xs text-gray-500">
                {isHydrated && user?.getEmail() ? user.getEmail() : 'Admin'}
              </p>
            </div>
          </Link>

          {/* Logout */}
          <button
            onClick={async () => {
              try {
                // Limpar cache do React Query
                queryClient.clear()
                
                // Fazer logout (limpa store, localStorage e chama API para remover cookie)
                await logout()
                
                // Forçar redirecionamento com reload completo para garantir limpeza
                window.location.href = '/login'
              } catch (error) {
                console.error('Erro ao fazer logout:', error)
                // Mesmo com erro, força redirecionamento
                window.location.href = '/login'
              }
            }}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Logout"
          >
            <MdLogout className="w-5 h-5" />
          </button>
        </div>
      </div>
    </nav>
  )
}


