'use client'

import { useCallback, useMemo, useState } from 'react'
import { CatalogProductRow } from '@/src/presentation/components/features/catalogo/CatalogProductRow'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import {
  useAtualizarPizzaSaborMutation,
  usePizzaSabores,
} from '@/src/presentation/hooks/pizza/usePizza'
import { usePizzaSaboresPrecosResumo } from '@/src/presentation/hooks/pizza/usePizzaSaboresPrecosResumo'
import { formatarPrecoAPartirDe } from '@/src/presentation/utils/pizza/pizzaMenuHelpers'
import { showToast } from '@/src/shared/utils/toast'
import type { CategoriaPizza, PrecoSaborTamanhoInput } from '@/src/shared/types/pizza'
import { PizzaSaborRowQuickActions } from './PizzaSaborRowQuickActions'

interface PizzaCategoriaSaboresSectionProps {
  categoria: CategoriaPizza
  tamanhosTotal: number
  onEditarSabor: (saborId: string) => void
}

export function PizzaCategoriaSaboresSection({
  categoria,
  tamanhosTotal,
  onEditarSabor,
}: PizzaCategoriaSaboresSectionProps) {
  const { data, isLoading } = usePizzaSabores(categoria.id)
  const atualizarSabor = useAtualizarPizzaSaborMutation()
  const [savingSaborId, setSavingSaborId] = useState<string | null>(null)

  const sabores = data?.items ?? []
  const saborIds = useMemo(() => sabores.map(s => s.id), [sabores])
  const { precosPorSaborId } = usePizzaSaboresPrecosResumo(saborIds)

  const handleToggleAtivo = useCallback(
    async (saborId: string, ativo: boolean) => {
      setSavingSaborId(saborId)
      try {
        await atualizarSabor.mutateAsync({
          id: saborId,
          categoriaPizzaId: categoria.id,
          patch: { ativo },
        })
      } catch (error) {
        showToast.error(error instanceof Error ? error.message : 'Erro ao atualizar sabor')
      } finally {
        setSavingSaborId(null)
      }
    },
    [atualizarSabor, categoria.id]
  )

  const handlePatchDescricao = useCallback(
    async (saborId: string, descricao: string | null) => {
      setSavingSaborId(saborId)
      try {
        await atualizarSabor.mutateAsync({
          id: saborId,
          categoriaPizzaId: categoria.id,
          patch: { descricao },
        })
        return true
      } catch (error) {
        showToast.error(error instanceof Error ? error.message : 'Erro ao salvar descrição')
        return false
      } finally {
        setSavingSaborId(null)
      }
    },
    [atualizarSabor, categoria.id]
  )

  const handlePatchPrecosTamanho = useCallback(
    async (saborId: string, precosTamanho: PrecoSaborTamanhoInput[]) => {
      setSavingSaborId(saborId)
      try {
        await atualizarSabor.mutateAsync({
          id: saborId,
          categoriaPizzaId: categoria.id,
          patch: { precosTamanho },
        })
        return true
      } catch (error) {
        showToast.error(error instanceof Error ? error.message : 'Erro ao salvar tamanhos')
        return false
      } finally {
        setSavingSaborId(null)
      }
    },
    [atualizarSabor, categoria.id]
  )

  if (isLoading) {
    return (
      <div className="px-1 py-2">
        <JiffyLoading text="Carregando sabores..." className="py-4" />
      </div>
    )
  }

  if (sabores.length === 0) {
    return (
      <p className="px-2 py-3 text-sm text-secondary-text md:px-4">
        Nenhum sabor cadastrado nesta categoria.
      </p>
    )
  }

  return (
    <div>
      {sabores.map(sabor => {
        const resumo = precosPorSaborId.get(sabor.id)
        const saving = savingSaborId === sabor.id
        return (
          <CatalogProductRow
            key={sabor.id}
            variant="menu"
            id={sabor.id}
            nome={sabor.nome}
            valor={0}
            valorSomenteLeitura
            valorExibicao={formatarPrecoAPartirDe(resumo?.precoMinimo)}
            ativo={sabor.ativo}
            imagemUrl={sabor.imagemUrl}
            isSavingStatus={saving && atualizarSabor.isPending}
            onValorChange={() => false}
            onSwitchToggle={handleToggleAtivo}
            onEdit={onEditarSabor}
            actionsSlot={
              <PizzaSaborRowQuickActions
                sabor={sabor}
                categoriaPizzaId={categoria.id}
                tamanhosComPreco={resumo?.tamanhosComPreco ?? 0}
                tamanhosTotal={tamanhosTotal}
                disabled={saving}
                onPatchDescricao={handlePatchDescricao}
                onPatchPrecosTamanho={handlePatchPrecosTamanho}
              />
            }
          />
        )
      })}
    </div>
  )
}
