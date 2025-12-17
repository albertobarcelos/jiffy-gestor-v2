'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useQueryClient } from '@tanstack/react-query'

interface ClienteActionsMenuProps {
  clienteId: string
  clienteAtivo: boolean
  onStatusChanged?: () => void
  onEdit?: (clienteId: string) => void
  onView?: (clienteId: string) => void
}

/**
 * Menu de ações do cliente
 * Replica exatamente o design do Flutter MenuAcaoUsuariosWidget
 */
export function ClienteActionsMenu({
  clienteId,
  clienteAtivo,
  onStatusChanged,
  onEdit,
  onView,
}: ClienteActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isUpward, setIsUpward] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const { auth } = useAuthStore()
  const queryClient = useQueryClient()

  // Prefetch ao hover nos botões de ação
  const handleMouseEnterEdit = () => {
    queryClient.prefetchQuery({
      queryKey: ['cliente', clienteId],
      queryFn: async () => {
        const token = auth?.getAccessToken()
        if (!token) throw new Error('Token não encontrado')
        const response = await fetch(`/api/clientes/${clienteId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
        if (!response.ok) throw new Error('Erro ao buscar cliente')
        const data = await response.json()
        return data
      },
      staleTime: 1000 * 60 * 5,
    })
  }

  const handleMouseEnterView = () => {
    queryClient.prefetchQuery({
      queryKey: ['cliente', clienteId],
      queryFn: async () => {
        const token = auth?.getAccessToken()
        if (!token) throw new Error('Token não encontrado')
        const response = await fetch(`/api/clientes/${clienteId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
        if (!response.ok) throw new Error('Erro ao buscar cliente')
        const data = await response.json()
        return data
      },
      staleTime: 1000 * 60 * 5,
    })
  }

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect()
      const screenHeight = window.innerHeight
      const menuHeightEstimate = 200

      const shouldOpenUpward =
        buttonRect.bottom + menuHeightEstimate > screenHeight &&
        buttonRect.top > menuHeightEstimate

      setIsUpward(shouldOpenUpward)
    }
  }, [isOpen])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleEdit = () => {
    setIsOpen(false)
    if (onEdit) {
      onEdit(clienteId)
    } else {
      window.location.href = `/cadastros/clientes/${clienteId}/editar`
    }
  }

  const handleView = () => {
    setIsOpen(false)
    if (onView) {
      onView(clienteId)
    } else {
      window.location.href = `/cadastros/clientes/${clienteId}/visualizar`
    }
  }

  const handleToggleStatus = async () => {
    try {
      const token = auth?.getAccessToken()
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const response = await fetch(`/api/clientes/${clienteId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ativo: !clienteAtivo }),
      })

      if (!response.ok) {
        throw new Error('Erro ao atualizar status')
      }

      setIsOpen(false)
      onStatusChanged?.()

      alert(
        clienteAtivo
          ? 'Cliente desativado com sucesso!'
          : 'Cliente ativado com sucesso!'
      )
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      alert('Erro ao atualizar status do cliente')
    }
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-secondary-bg/20 transition-colors"
      >
        <span className="text-xl text-primary-text">⋮</span>
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className={`absolute right-0 ${
            isUpward ? 'bottom-full mb-2' : 'top-full mt-2'
          } w-[200px] bg-info rounded-[10px] shadow-lg z-50`}
          style={{
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
          }}
        >
          {/* Visualizar */}
          <button
            onClick={handleView}
            onMouseEnter={handleMouseEnterView}
            className="w-full h-10 px-6 flex items-center gap-2 text-primary-text hover:bg-primary hover:text-info transition-colors rounded-t-[10px]"
          >
            <span>👁️</span>
            <span className="text-sm font-medium">Visualizar</span>
          </button>

          <div className="h-px bg-alternate"></div>

          {/* Editar */}
          <button
            onClick={handleEdit}
            onMouseEnter={handleMouseEnterEdit}
            className="w-full h-10 px-6 flex items-center gap-2 text-primary-text hover:bg-primary hover:text-info transition-colors"
          >
            <span>✏️</span>
            <span className="text-sm font-medium">Editar</span>
          </button>

          <div className="h-px bg-alternate"></div>

          {/* Ativar/Desativar */}
          <button
            onClick={handleToggleStatus}
            className="w-full h-10 px-6 flex items-center gap-2 text-primary-text hover:bg-primary hover:text-info transition-colors rounded-b-[10px]"
          >
            <span>{clienteAtivo ? '🔴' : '✅'}</span>
            <span className="text-sm font-medium">
              {clienteAtivo ? 'Desativar' : 'Ativar'}
            </span>
          </button>
        </div>
      )}
    </div>
  )
}

