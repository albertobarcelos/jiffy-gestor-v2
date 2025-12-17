'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast } from '@/src/shared/utils/toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/src/presentation/components/ui/dialog'

interface UsuarioActionsMenuProps {
  usuarioId: string
  usuarioAtivo: boolean
  onStatusChanged?: () => void
  onEdit?: () => void
  onDeleted?: () => void
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
  onDeleted,
}: UsuarioActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isUpward, setIsUpward] = useState(false)
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
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

      showToast.success(
        usuarioAtivo
          ? 'Usuário desativado com sucesso!'
          : 'Usuário ativado com sucesso!'
      )
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      showToast.error('Erro ao atualizar status do usuário')
    }
  }

  const handleDeleteClick = () => {
    setIsOpen(false)
    setIsConfirmDeleteOpen(true)
  }

  const handleConfirmDelete = async () => {
    setIsDeleting(true)

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
        // Tenta obter mensagem de erro se houver corpo na resposta
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erro ao deletar usuário')
      }

      setIsConfirmDeleteOpen(false)
      showToast.success('Usuário deletado com sucesso!')
      onDeleted?.()
    } catch (error) {
      console.error('Erro ao deletar usuário:', error)
      showToast.error(
        error instanceof Error ? error.message : 'Erro ao deletar usuário'
      )
    } finally {
      setIsDeleting(false)
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

          <div className="h-px bg-primary"></div>

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

          <div className="h-px bg-primary"></div>

          {/* Deletar */}
          <button
            onClick={handleDeleteClick}
            className="w-full h-10 px-6 flex items-center gap-2 text-red-500 hover:bg-red-500 hover:text-white transition-colors rounded-b-[10px]"
          >
            <span>🗑️</span>
            <span className="text-sm font-medium">Deletar</span>
          </button>
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      <Dialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-primary-text">
              Confirmar exclusão
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-primary-text">
              Tem certeza que deseja deletar este usuário?
            </p>
            <p className="text-sm text-secondary-text mt-2">
              Esta ação não pode ser desfeita.
            </p>
          </div>
          <DialogFooter className="flex gap-3">
            <button
              type="button"
              onClick={() => setIsConfirmDeleteOpen(false)}
              disabled={isDeleting}
              className="h-10 px-6 rounded-lg border border-gray-300 text-primary-text hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="h-10 px-6 rounded-lg bg-error text-white font-semibold hover:bg-error/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isDeleting ? 'Deletando...' : 'Deletar'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

