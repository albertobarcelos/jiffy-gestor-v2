'use client'

import { DinamicIcon } from '@/src/shared/utils/iconRenderer'
import { ProdutoStatusSwitch } from '@/src/presentation/components/features/produtos/ProdutosList/ProdutoStatusSwitch'
import { Button } from '@/src/presentation/components/ui/button'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { usePizzaSabores } from '@/src/presentation/hooks/pizza/usePizza'
import type { CategoriaPizza } from '@/src/shared/types/pizza'
import { cn } from '@/src/shared/utils/cn'

interface PizzaCategoriaSaboresSectionProps {
  categoria: CategoriaPizza
  tamanhosCount: number
  onAdicionarSabor: () => void
}

export function PizzaCategoriaSaboresSection({
  categoria,
  tamanhosCount,
  onAdicionarSabor,
}: PizzaCategoriaSaboresSectionProps) {
  const { data, isLoading } = usePizzaSabores(categoria.id)
  const sabores = data?.items ?? []
  const vazia = sabores.length === 0

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
              </tr>
            </thead>
            <tbody>
              {sabores.map(sabor => (
                <tr key={sabor.id} className="border-t border-gray-100">
                  <td className="px-3 py-3">
                    <div className="flex items-start gap-3">
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
                    </div>
                  </td>
                  <td className="px-3 py-3 text-secondary-text">
                    {tamanhosCount > 0
                      ? `Disponível em ${tamanhosCount} tamanho${tamanhosCount > 1 ? 's' : ''}`
                      : '—'}
                  </td>
                  <td className="px-3 py-3">
                    <ProdutoStatusSwitch isAtivo={sabor.ativo} onChange={() => {}} disabled />
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
