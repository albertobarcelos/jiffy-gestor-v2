'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ComplementoNoGrupo, TipoImpactoPreco } from '@/src/domain/complemento/tipos'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { handleApiError, showToast } from '@/src/shared/utils/toast'
import {
  buscarComplementoCompleto,
  gravarOverridesComplemento,
} from './complementoOverrideApi'

interface ComplementoGruposTabProps {
  complementoId: string
}

export function ComplementoGruposTab({ complementoId }: ComplementoGruposTabProps) {
  const [grupos, setGrupos] = useState<ComplementoNoGrupo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [salvandoId, setSalvandoId] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setIsLoading(true)
    setErro(null)
    try {
      const completo = await buscarComplementoCompleto(complementoId)
      setGrupos(completo.grupos)
    } catch (error) {
      setErro(handleApiError(error))
    } finally {
      setIsLoading(false)
    }
  }, [complementoId])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const alterarImpacto = useCallback(
    async (grupo: ComplementoNoGrupo, tipoImpactoPreco: TipoImpactoPreco) => {
      if (grupo.tipoImpactoPreco === tipoImpactoPreco) return
      setSalvandoId(grupo.id)
      try {
        await gravarOverridesComplemento({
          grupos: [
            {
              grupoComplementoId: grupo.id,
              complementoId,
              tipoImpactoPreco,
            },
          ],
        })
        setGrupos(prev =>
          prev.map(item => (item.id === grupo.id ? { ...item, tipoImpactoPreco } : item))
        )
        showToast.success('Impacto deste grupo atualizado.')
      } catch (error) {
        showToast.error(handleApiError(error))
      } finally {
        setSalvandoId(null)
      }
    },
    [complementoId]
  )

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <JiffyLoading />
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-info p-3 md:p-5">
      <p className="mb-3 text-sm text-secondary-text">
        O impacto vale neste grupo, em todos os cardápios que o usam.
      </p>
      {erro ? <p className="mb-3 text-sm text-red-600">{erro}</p> : null}
      {grupos.length === 0 ? (
        <p className="py-10 text-center text-sm text-secondary-text">
          Este complemento não entra em nenhum grupo.
        </p>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-gray-100 bg-white">
          {grupos.map(grupo => (
            <div
              key={grupo.id}
              className="grid items-center gap-3 border-b border-gray-100 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_9rem]"
            >
              <p className="truncate text-sm font-medium text-primary-text">{grupo.nome}</p>
              <select
                value={grupo.tipoImpactoPreco}
                disabled={salvandoId === grupo.id}
                onChange={event =>
                  void alterarImpacto(grupo, event.target.value as TipoImpactoPreco)
                }
                aria-label={`Impacto no grupo ${grupo.nome}`}
                className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-xs uppercase text-primary-text focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="nenhum">Nenhum</option>
                <option value="aumenta">Aumenta</option>
                <option value="diminui">Diminui</option>
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
