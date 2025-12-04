'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'

interface GrupoComplementoActionsMenuProps {
  grupoId: string
  grupoAtivo: boolean
  onStatusChanged?: () => void
  onEditRequested?: (grupoId: string) => void
}

/**
 * Menu de ações do grupo de complementos
 * Replica exatamente o design do Flutter MenuAcaoGrupoWidget
 */
export function GrupoComplementoActionsMenu({
  grupoId,
  grupoAtivo,
  onStatusChanged,
  onEditRequested,
}: GrupoComplementoActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isUpward, setIsUpward] = useState(false)
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false)
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
      onEditRequested(grupoId)
    } else {
      window.location.href = `/cadastros/grupos-complementos/${grupoId}/editar`
    }
  }

  const handleDelete = () => {
    alert('Remoção de grupo indisponível no momento.')
  }

  const handleToggleStatus = async () => {
    try {
      const token = auth?.getAccessToken()
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const response = await fetch(`/api/grupos-complementos/${grupoId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ativo: !grupoAtivo }),
      })

      if (!response.ok) {
        throw new Error('Erro ao atualizar status')
      }

      setIsOpen(false)
      await onStatusChanged?.()

      alert(
        grupoAtivo
          ? 'Grupo de complementos desativado com sucesso!'
          : 'Grupo de complementos ativado com sucesso!'
      )
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      alert('Erro ao atualizar status do grupo de complementos')
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

          {/* Ativar/Desativar */}
          <button
            onClick={handleToggleStatus}
            className="w-full h-10 px-6 flex items-center gap-2 text-primary-text hover:bg-primary hover:text-info transition-colors"
          >
            <span>{grupoAtivo ? '🔴' : '✅'}</span>
            <span className="text-sm font-medium">
              {grupoAtivo ? 'Desativar' : 'Ativar'}
            </span>
          </button>

          <div className="h-px bg-alternate"></div>

          {/* Deletar - temporariamente indisponível */}
          <div className="w-full h-10 px-6 flex items-center gap-2 text-secondary-text bg-secondary-bg/40 rounded-b-[10px] text-sm">
            <span>🗑️</span>
            <span>Remoção indisponível</span>
          </div>
        </div>
      )}
    </div>
  )
}

