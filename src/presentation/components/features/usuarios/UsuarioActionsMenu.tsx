'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'

interface UsuarioActionsMenuProps {
  usuarioId: string
  usuarioAtivo: boolean
  onStatusChanged?: () => void
  onEdit?: () => void
}

/**
 * Menu de ações do usuário
 * Replica exatamente o design do Flutter
 */
export function UsuarioActionsMenu({
  usuarioId,
  usuarioAtivo,
  onStatusChanged,
  onEdit,
}: UsuarioActionsMenuProps) {
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
    if (onEdit) {
      onEdit()
    } else {
      window.location.href = `/cadastros/usuarios/${usuarioId}/editar`
    }
  }

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja deletar este usuário?')) {
      setIsOpen(false)
      return
    }

    try {
      const token = auth?.getAccessToken()
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const response = await fetch(`/api/usuarios/${usuarioId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Erro ao deletar usuário')
      }

      setIsOpen(false)
      onStatusChanged?.()

      alert('Usuário deletado com sucesso!')
    } catch (error) {
      console.error('Erro ao deletar usuário:', error)
      alert('Erro ao deletar usuário')
    }
  }

  const handleToggleStatus = async () => {
    try {
      const token = auth?.getAccessToken()
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const response = await fetch(`/api/usuarios/${usuarioId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ativo: !usuarioAtivo }),
      })

      if (!response.ok) {
        throw new Error('Erro ao atualizar status')
      }

      setIsOpen(false)
      onStatusChanged?.()

      alert(
        usuarioAtivo
          ? 'Usuário desativado com sucesso!'
          : 'Usuário ativado com sucesso!'
      )
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      alert('Erro ao atualizar status do usuário')
    }
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-secondary-bg/20 transition-colors"
        type="button"
      >
        <span className="text-xl text-primary-text">⋮</span>
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className={`absolute right-0 ${
            isUpward ? 'bottom-full mb-2' : 'top-full mt-2'
          } w-[200px] bg-info rounded-[10px] shadow-lg z-[100]`}
          style={{
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
          }}
          onClick={(e) => e.stopPropagation()}
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

          {/* Ativar/Desativar */}
          <button
            onClick={handleToggleStatus}
            className="w-full h-10 px-6 flex items-center gap-2 text-primary-text hover:bg-primary hover:text-info transition-colors"
          >
            <span>{usuarioAtivo ? '🔴' : '✅'}</span>
            <span className="text-sm font-medium">
              {usuarioAtivo ? 'Desativar' : 'Ativar'}
            </span>
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

