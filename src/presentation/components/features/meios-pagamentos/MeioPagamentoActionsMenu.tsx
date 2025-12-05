'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast } from '@/src/shared/utils/toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/src/presentation/components/ui/dialog'

interface MeioPagamentoActionsMenuProps {
  meioPagamentoId: string
  meioPagamentoAtivo: boolean
  onStatusChanged?: () => void
  onEditRequested?: (meioPagamentoId: string) => void
}

/**
 * Menu de ações do meio de pagamento
 * Replica exatamente o design do Flutter
 */
export function MeioPagamentoActionsMenu({
  meioPagamentoId,
  meioPagamentoAtivo,
  onStatusChanged,
  onEditRequested,
}: MeioPagamentoActionsMenuProps) {
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
    if (onEditRequested) {
      onEditRequested(meioPagamentoId)
    } else {
      window.location.href = `/cadastros/meios-pagamentos/${meioPagamentoId}/editar`
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

      const response = await fetch(`/api/meios-pagamentos/${meioPagamentoId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || errorData.error || 'Erro ao deletar meio de pagamento')
      }

      setIsConfirmDeleteOpen(false)
      onStatusChanged?.()
      showToast.success('Meio de pagamento deletado com sucesso!')
    } catch (error) {
      console.error('Erro ao deletar meio de pagamento:', error)
      showToast.error(error instanceof Error ? error.message : 'Erro ao deletar meio de pagamento')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleToggleStatus = async () => {
    try {
      const token = auth?.getAccessToken()
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const response = await fetch(`/api/meios-pagamentos/${meioPagamentoId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ativo: !meioPagamentoAtivo }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || errorData.error || 'Erro ao atualizar status')
      }

      setIsOpen(false)
      onStatusChanged?.()
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      showToast.error(error instanceof Error ? error.message : 'Erro ao atualizar status do meio de pagamento')
    }
  }

  return (
    <div className="relative z-50">
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
          } w-[200px] bg-info rounded-[10px] shadow-lg z-[100]`}
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

          {/* Ativar/Desativar */}
          <button
            onClick={handleToggleStatus}
            className="w-full h-10 px-6 flex items-center gap-2 text-primary-text hover:bg-primary hover:text-info transition-colors"
          >
            <span>{meioPagamentoAtivo ? '🔴' : '✅'}</span>
            <span className="text-sm font-medium">
              {meioPagamentoAtivo ? 'Desativar' : 'Ativar'}
            </span>
          </button>

          <div className="h-px bg-alternate"></div>

          {/* Deletar */}
          <button
            onClick={handleDeleteClick}
            className="w-full h-10 px-6 flex items-center gap-2 text-primary-text hover:bg-error hover:text-info transition-colors rounded-b-[10px]"
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
              Tem certeza que deseja deletar este meio de pagamento?
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

