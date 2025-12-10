'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'

interface GrupoProdutoActionsMenuProps {
  grupoId: string
  grupoAtivo: boolean
  onStatusChanged?: () => void
  onEdit?: (grupoId: string) => void
}

/**
 * Menu de ações para grupos de produtos
 * Replica o design e lógica do Flutter MenuAcaoGrupoProdutosWidget
 */
export function GrupoProdutoActionsMenu({
  grupoId,
  grupoAtivo,
  onStatusChanged,
  onEdit,
}: GrupoProdutoActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { auth } = useAuthStore()

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
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

  const handleToggleStatus = async () => {
    try {
      const token = auth?.getAccessToken()
      if (!token) {
        alert('Token não encontrado')
        return
      }

      // Buscar dados atuais do grupo
      const getResponse = await fetch(`/api/grupos-produtos/${grupoId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!getResponse.ok) {
        throw new Error('Erro ao buscar grupo')
      }

      const grupo = await getResponse.json()

      // Atualizar status
      const updateResponse = await fetch(`/api/grupos-produtos/${grupoId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nome: grupo.nome,
          ativo: !grupoAtivo,
          corHex: grupo.corHex,
          iconName: grupo.iconName,
          ativoDelivery: grupo.ativoDelivery,
          ativoLocal: grupo.ativoLocal,
        }),
      })

      if (updateResponse.ok) {
        setIsOpen(false)
        onStatusChanged?.()
      } else {
        const error = await updateResponse.json()
        alert(error.message || 'Erro ao atualizar status')
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      alert('Erro ao atualizar status do grupo')
    }
  }

  const handleEdit = () => {
    setIsOpen(false)
    onEdit?.(grupoId)
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-secondary-text hover:bg-primary-bg/10 rounded-lg transition-colors"
      >
        <span className="text-xl">⋮</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[200px] bg-info rounded-lg shadow-lg border border-secondary/20 z-50">
          <button
            onClick={handleEdit}
            className="w-full px-6 py-2 text-left text-primary-text hover:bg-primary-bg/10 transition-colors font-nunito text-sm flex items-center gap-2"
          >
            <span>✏️</span>
            <span>Editar</span>
          </button>
          <div className="h-px bg-primary/50"></div>
          <button
            onClick={handleToggleStatus}
            className="w-full px-6 py-2 text-left text-primary-text hover:bg-primary-bg/10 transition-colors font-nunito text-sm flex items-center gap-2"
          >
            <span>{grupoAtivo ? '🔴' : '🟢'}</span>
            <span>{grupoAtivo ? 'Desativar' : 'Ativar'}</span>
          </button>
        </div>
      )}
    </div>
  )
}

