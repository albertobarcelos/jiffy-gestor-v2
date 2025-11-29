'use client'

import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useQueryClient } from '@tanstack/react-query'
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/src/presentation/components/ui/dropdown-menu'
import { Button } from '@/src/presentation/components/ui/button'
import { showToast, handleApiError } from '@/src/shared/utils/toast'

interface ProdutoActionsMenuProps {
  produtoId: string
  produtoAtivo: boolean
  onStatusChanged?: () => void
  onEdit?: (produtoId: string) => void
  onCopy?: (produtoId: string) => void
}

/**
 * Menu de ações do produto
 * Replica exatamente o design do Flutter MenuAcaoProdutoWidget
 */
export function ProdutoActionsMenu({
  produtoId,
  produtoAtivo,
  onStatusChanged,
  onEdit,
  onCopy,
}: ProdutoActionsMenuProps) {
  const { auth } = useAuthStore()
  const queryClient = useQueryClient()

  // Prefetch ao hover no botão de editar
  const handleMouseEnterEdit = () => {
    queryClient.prefetchQuery({
      queryKey: ['produto', produtoId],
      queryFn: async () => {
        const token = auth?.getAccessToken()
        if (!token) throw new Error('Token não encontrado')
        const response = await fetch(`/api/produtos/${produtoId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
        if (!response.ok) throw new Error('Erro ao buscar produto')
        const data = await response.json()
        return data
      },
      staleTime: 1000 * 60 * 5,
    })
  }

  const handleEdit = () => {
    if (onEdit) {
      onEdit(produtoId)
      return
    }
    window.location.href = `/produtos/${produtoId}/editar`
  }

  const handleCopy = () => {
    if (onCopy) {
      onCopy(produtoId)
      return
    }
    window.location.href = `/produtos/novo?copyFrom=${produtoId}`
  }

  const handleToggleStatus = async () => {
    const toastId = showToast.loading(
      produtoAtivo ? 'Desativando produto...' : 'Ativando produto...'
    )

    try {
      const token = auth?.getAccessToken()
      if (!token) {
        showToast.errorLoading(toastId, 'Token não encontrado')
        return
      }

      const response = await fetch(`/api/produtos/${produtoId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ativo: !produtoAtivo }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || 'Erro ao atualizar status')
      }

      onStatusChanged?.()

      showToast.successLoading(
        toastId,
        produtoAtivo
          ? 'Produto desativado com sucesso!'
          : 'Produto ativado com sucesso!'
      )
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      const errorMessage = handleApiError(error)
      showToast.errorLoading(toastId, errorMessage)
    }
  }

  return (
    <DropdownMenu
      trigger={
        <Button variant="ghost" size="icon" className="h-10 w-10">
          <span className="text-xl text-primary-text">⋮</span>
        </Button>
      }
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
    >
      <DropdownMenuItem
        onClick={handleEdit}
        onMouseEnter={handleMouseEnterEdit}
        className="cursor-pointer"
      >
        <span className="mr-2">✏️</span>
        <span>Editar</span>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={handleCopy} className="cursor-pointer">
        <span className="mr-2">📋</span>
        <span>Copiar</span>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={handleToggleStatus} className="cursor-pointer">
        <span className="mr-2">{produtoAtivo ? '🔴' : '✅'}</span>
        <span>{produtoAtivo ? 'Desativar' : 'Ativar'}</span>
      </DropdownMenuItem>
    </DropdownMenu>
  )
}

