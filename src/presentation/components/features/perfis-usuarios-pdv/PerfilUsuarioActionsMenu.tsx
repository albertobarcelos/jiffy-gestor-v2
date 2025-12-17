'use client'

import { useState, useRef, useEffect } from 'react'

interface PerfilUsuarioActionsMenuProps {
  perfilId: string
  onStatusChanged?: () => void
  onEdit?: () => void
}

/**
 * Menu de ações do perfil de usuário
 * Replica exatamente o design do Flutter
 */
export function PerfilUsuarioActionsMenu({
  perfilId,
  onStatusChanged,
  onEdit,
}: PerfilUsuarioActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isUpward, setIsUpward] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

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
      window.location.href = `/cadastros/perfis-usuarios-pdv/${perfilId}/editar`
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
            className="w-full h-10 px-6 flex items-center gap-2 text-primary-text hover:bg-primary hover:text-info transition-colors rounded-[10px]"
          >
            <span>✏️</span>
            <span className="text-sm font-medium">Editar</span>
          </button>
        </div>
      )}
    </div>
  )
}

