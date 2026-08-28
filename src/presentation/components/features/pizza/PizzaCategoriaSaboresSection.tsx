'use client'

import { useState } from 'react'
import { MdArrowDownward, MdArrowUpward, MdEdit } from 'react-icons/md'
import { ProdutoStatusSwitch } from '@/src/presentation/components/features/produtos/ProdutosList/ProdutoStatusSwitch'
import { Button } from '@/src/presentation/components/ui/button'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import {
  useAtualizarPizzaSaborMutation,
  usePizzaSabores,
  useReordenarPizzaSaborMutation,
} from '@/src/presentation/hooks/pizza/usePizza'
import { showToast } from '@/src/shared/utils/toast'
import type { CategoriaPizza, SaborPizzaSummary } from '@/src/shared/types/pizza'
import { cn } from '@/src/shared/utils/cn'

interface PizzaCategoriaSaboresSectionProps {
  categoria: CategoriaPizza
  tamanhosCount: number
  onAdicionarSabor: () => void
  onEditarSabor: (saborId: string) => void
}

export function PizzaCategoriaSaboresSection({
  categoria,
  tamanhosCount,
  onAdicionarSabor,
  onEditarSabor,
}: PizzaCategoriaSaboresSectionProps) {
  const { data, isLoading, refetch } = usePizzaSabores(categoria.id)
  const atualizarSabor = useAtualizarPizzaSaborMutation()
  const reordenarSabor = useReordenarPizzaSaborMutation()
  const [savingSaborId, setSavingSaborId] = useState<string | null>(null)

  const sabores = data?.items ?? []
  const vazia = sabores.length === 0

  const handleToggleAtivo = async (sabor: SaborPizzaSummary, ativo: boolean) => {
    setSavingSaborId(sabor.id)
    try {
      await atualizarSabor.mutateAsync({
        id: sabor.id,
        categoriaPizzaId: categoria.id,
        patch: { ativo },
      })
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Erro ao atualizar sabor')
    } finally {
      setSavingSaborId(null)
    }
  }

  const handleReordenar = async (sabor: SaborPizzaSummary, direction: 'up' | 'down') => {
    const index = sabores.findIndex(s => s.id === sabor.id)
    if (index < 0) return
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= sabores.length) return

    setSavingSaborId(sabor.id)
    try {
      await reordenarSabor.mutateAsync({
        id: sabor.id,
        novaPosicao: targetIndex + 1,
        categoriaPizzaId: categoria.id,
      })
      await refetch()
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Erro ao reordenar sabor')
    } finally {
      setSavingSaborId(null)
    }
  }

  return (
    <div className="border-t border-gray-100 px-4 py-4 md:px-6">
      {isLoading ? (
        <JiffyLoading text="Carregando sabores..." className="py-4" />
      ) : vazia ? (
        <p className="text-sm text-secondary-text">Nenhum sabor cadastrado nesta categoria.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-secondary-text">
              <tr>
                <th className="px-3 py-2 font-medium">Sabores</th>
                <th className="px-3 py-2 font-medium">Tamanho</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="w-28 px-3 py-2 font-medium">Ordem</th>
                <th className="w-12 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {sabores.map((sabor, index) => (
                <tr key={sabor.id} className="border-t border-gray-100">
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      className="flex w-full items-start gap-3 text-left hover:opacity-80"
                      onClick={() => onEditarSabor(sabor.id)}
                    >
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg"
                        aria-hidden
                      >
                        🍕
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-primary-text">{sabor.nome}</p>
                        {sabor.descricao ? (
                          <p className="truncate text-xs text-secondary-text">{sabor.descricao}</p>
                        ) : null}
                      </div>
                    </button>
                  </td>
                  <td className="px-3 py-3 text-secondary-text">
                    {tamanhosCount > 0
                      ? `Disponível em ${tamanhosCount} tamanho${tamanhosCount > 1 ? 's' : ''}`
                      : '—'}
                  </td>
                  <td className="px-3 py-3">
                    <ProdutoStatusSwitch
                      isAtivo={sabor.ativo}
                      disabled={savingSaborId === sabor.id}
                      onChange={ativo => void handleToggleAtivo(sabor, ativo)}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        className="rounded p-1 text-secondary-text hover:bg-gray-100 disabled:opacity-30"
                        disabled={index === 0 || savingSaborId === sabor.id}
                        aria-label="Subir sabor"
                        onClick={() => void handleReordenar(sabor, 'up')}
                      >
                        <MdArrowUpward size={16} />
                      </button>
                      <button
                        type="button"
                        className="rounded p-1 text-secondary-text hover:bg-gray-100 disabled:opacity-30"
                        disabled={index === sabores.length - 1 || savingSaborId === sabor.id}
                        aria-label="Descer sabor"
                        onClick={() => void handleReordenar(sabor, 'down')}
                      >
                        <MdArrowDownward size={16} />
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      className="rounded p-1 text-primary hover:bg-primary/5"
                      aria-label="Editar sabor"
                      onClick={() => onEditarSabor(sabor.id)}
                    >
                      <MdEdit size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Button
        type="button"
        variant="outlined"
        className={cn('mt-4 border-primary text-primary', tamanhosCount === 0 && 'opacity-60')}
        disabled={tamanhosCount === 0}
        onClick={onAdicionarSabor}
      >
        + Adicionar item
      </Button>
    </div>
  )
}
