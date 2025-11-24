'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useQueryClient } from '@tanstack/react-query'

/**
 * Sidebar do dashboard
 * Replica exatamente o design e nomes do Flutter JiffySidebarWidget
 */
export function Sidebar() {
  const [isCompact, setIsCompact] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set())
  const pathname = usePathname()
  const router = useRouter()
  const { logout } = useAuthStore()
  const queryClient = useQueryClient()

  // Prefetch de rota ao hover
  const handleLinkHover = (path: string) => {
    if (path && path !== '#') {
      router.prefetch(path)
    }
  }

  const toggleMenu = (menuName: string) => {
    const newExpanded = new Set(expandedMenus)
    if (newExpanded.has(menuName)) {
      newExpanded.delete(menuName)
    } else {
      newExpanded.add(menuName)
    }
    setExpandedMenus(newExpanded)
  }

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: '🏠' },
    {
      name: 'Cadastros',
      path: '#',
      icon: '📋',
      children: [
        { name: 'Grupo Produtos', path: '/cadastros/grupos-produtos', icon: '📦' },
        { name: 'Produtos', path: '/produtos', icon: '🛍️' },
        { name: 'Grupo Complementos', path: '/cadastros/grupos-complementos', icon: '📋' },
        { name: 'Complementos', path: '/cadastros/complementos', icon: '➕' },
        { name: 'Usuários', path: '/cadastros/usuarios', icon: '👤' },
        { name: 'Perfis de Usuários', path: '/cadastros/perfis-usuarios', icon: '👥' },
        { name: 'Clientes', path: '/cadastros/clientes', icon: '👥' },
        { name: 'Impressoras', path: '/cadastros/impressoras', icon: '🖨️' },
        { name: 'Meios de Pagamentos', path: '/cadastros/meios-pagamentos', icon: '💳' },
      ],
    },
    { name: 'Estoque', path: '/estoque', icon: '📦' },
    { name: 'Meu Caixa', path: '/meu-caixa', icon: '💼' },
    { name: 'Relatórios', path: '/relatorios', icon: '📊' },
    { name: 'Configurações', path: '/configuracoes', icon: '⚙️' },
  ]

  const isMenuActive = (item: typeof menuItems[0]) => {
    if (item.path !== '#') {
      return pathname === item.path || pathname?.startsWith(item.path + '/')
    }
    // Para menus com children, verificar se algum filho está ativo
    if (item.children) {
      return item.children.some((child) => pathname === child.path || pathname?.startsWith(child.path + '/'))
    }
    return false
  }

  const isChildActive = (childPath: string) => {
    return pathname === childPath || pathname?.startsWith(childPath + '/')
  }

  return (
    <div
      className={`h-full bg-alternate transition-all duration-300 ${
        isCompact ? 'w-[100px]' : 'w-[250px]'
      }`}
    >
      <div className="h-full flex flex-col">
        {/* Logo */}
        {!isCompact && (
          <div className="p-4 pt-6">
            <div className="relative w-[200px] h-[60px]">
              <Image
                src="/images/logo-branco.png"
                alt="Jiffy Gestor"
                fill
                sizes="200px"
                className="object-contain"
                priority
              />
            </div>
          </div>
        )}

        {/* Botão de compactar */}
        <div className="flex justify-end pr-2">
          <button
            onClick={() => setIsCompact(!isCompact)}
            className="w-[35px] h-[48px] bg-alternate rounded-tl-[15px] rounded-bl-[15px] flex items-center justify-center hover:bg-alternate/90 transition-colors"
          >
            <span className="text-info text-xl">
              {isCompact ? '→' : '←'}
            </span>
          </button>
        </div>

        {/* Menu items */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-2 px-2">
            {menuItems.map((item) => {
              const isActive = isMenuActive(item)
              const isExpanded = expandedMenus.has(item.name)

              if (item.children) {
                // Menu expandável
                return (
                  <li key={item.name}>
                    <div>
                      <button
                        onClick={() => !isCompact && toggleMenu(item.name)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                          isActive
                            ? 'bg-info/20 text-info font-semibold'
                            : 'text-info/80 hover:bg-info/10'
                        }`}
                      >
                        <span className="text-xl">{item.icon}</span>
                        {!isCompact && (
                          <>
                            <span className="flex-1 text-left">{item.name}</span>
                            <span className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                              ▼
                            </span>
                          </>
                        )}
                      </button>
                      {!isCompact && isExpanded && (
                        <ul className="pl-4 mt-1 space-y-1">
                          {item.children.map((child) => {
                            const isChildActive = pathname === child.path || pathname?.startsWith(child.path + '/')
                            return (
                              <li key={child.path}>
                                <Link
                                  href={child.path}
                                  onMouseEnter={() => handleLinkHover(child.path)}
                                  prefetch={true}
                                  className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                                    isChildActive
                                      ? 'bg-info/20 text-info font-semibold'
                                      : 'text-info/60 hover:bg-info/10'
                                  }`}
                                >
                                  <span className="text-lg">{child.icon}</span>
                                  <span>{child.name}</span>
                                </Link>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </div>
                  </li>
                )
              }

              // Menu item simples
              return (
                <li key={item.path}>
                  <Link
                    href={item.path}
                    onMouseEnter={() => handleLinkHover(item.path)}
                    prefetch={true}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-info/20 text-info font-semibold'
                        : 'text-info/80 hover:bg-info/10'
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    {!isCompact && <span>{item.name}</span>}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-info/20">
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
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-info/80 hover:bg-info/10 transition-colors ${
              isCompact ? 'justify-center' : ''
            }`}
          >
            <span className="text-xl">🚪</span>
            {!isCompact && <span>Logout</span>}
          </button>
        </div>
      </div>
    </div>
  )
}
