'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'

interface PerfilUsuarioActionsMenuProps {
  perfilId: string
  onStatusChanged?: () => void
}

/**
 * Menu de ações do perfil de usuário
 * Replica exatamente o design do Flutter
 */
export function PerfilUsuarioActionsMenu({
  perfilId,
  onStatusChanged,
}: PerfilUsuarioActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isUpward, setIsUpward] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const { auth } = useAuthStore()

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
    window.location.href = `/cadastros/perfis-usuarios-pdv/${perfilId}/editar`
  }

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja deletar este perfil de usuário?')) {
      setIsOpen(false)
      return
    }

    try {
      const token = auth?.getAccessToken()
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const response = await fetch(`/api/perfis-usuarios-pdv/${perfilId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Erro ao deletar perfil de usuário')
      }

      setIsOpen(false)
      onStatusChanged?.()

      alert('Perfil de usuário deletado com sucesso!')
    } catch (error) {
      console.error('Erro ao deletar perfil de usuário:', error)
      alert('Erro ao deletar perfil de usuário')
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
          {/* Editar */}
          <button
            onClick={handleEdit}
            className="w-full h-10 px-6 flex items-center gap-2 text-primary-text hover:bg-primary hover:text-info transition-colors rounded-t-[10px]"
          >
            <span>✏️</span>
            <span className="text-sm font-medium">Editar</span>
          </button>

          <div className="h-px bg-alternate"></div>

          {/* Deletar */}
          <button
            onClick={handleDelete}
            className="w-full h-10 px-6 flex items-center gap-2 text-primary-text hover:bg-error hover:text-info transition-colors rounded-b-[10px]"
          >
            <span>🗑️</span>
            <span className="text-sm font-medium">Deletar</span>
          </button>
        </div>
      )}
    </div>
  )
}

