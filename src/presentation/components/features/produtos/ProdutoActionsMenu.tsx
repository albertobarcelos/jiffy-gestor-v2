'use client'

import { useAuthStore } from '@/src/presentation/stores/authStore'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/src/presentation/components/ui/dropdown-menu'
import { Button } from '@/src/presentation/components/ui/button'
import { showToast, handleApiError } from '@/src/shared/utils/toast'

interface ProdutoActionsMenuProps {
  produtoId: string
  produtoAtivo: boolean
  onStatusChanged?: () => void
}

/**
 * Menu de ações do produto
 * Replica exatamente o design do Flutter MenuAcaoProdutoWidget
 */
export function ProdutoActionsMenu({
  produtoId,
  produtoAtivo,
  onStatusChanged,
}: ProdutoActionsMenuProps) {
  const { auth } = useAuthStore()

  const handleEdit = () => {
    window.location.href = `/produtos/${produtoId}/editar`
  }

  const handleCopy = () => {
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
        method: 'PUT',
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10">
          <span className="text-xl text-primary-text">⋮</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuItem onClick={handleEdit} className="cursor-pointer">
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
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

