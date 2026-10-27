'use client'

import { useCallback, useEffect, useState } from 'react'
import { FormControlLabel, Radio, RadioGroup } from '@mui/material'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import {
  ShimmerLine,
  ShimmerRect,
  ShimmerRepeat,
} from '@/src/presentation/components/ui/shimmer'
import { cn } from '@/src/shared/utils/cn'
import type { PizzaCategoriaDraft } from './pizzaDefaults'

interface PizzaCategoriaRegraPrecoStepProps {
  draft: PizzaCategoriaDraft
  onChange: (draft: PizzaCategoriaDraft) => void
}

type ImpressoraCatalogItem = {
  id: string
  nome: string
}

const SCROLLBAR_BRANCA =
  '[scrollbar-color:white_white] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-white [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white [&::-webkit-scrollbar-thumb:hover]:bg-white'

const IMPRESSORAS_SKELETON_ITENS = 6

function ImpressorasListSkeleton() {
  return (
    <div
      className="min-h-0 flex-1 overflow-hidden"
      aria-busy="true"
      aria-label="Carregando impressoras"
    >
      <ul className="flex flex-col gap-1">
        <ShimmerRepeat count={IMPRESSORAS_SKELETON_ITENS}>
          {index => (
            <li
              key={index}
              className="flex w-full items-center justify-between gap-3 py-0.5"
              aria-hidden
            >
              <ShimmerLine width={`${48 + (index % 3) * 12}%`} height={16} />
              <ShimmerRect width={36} height={20} radius={999} />
            </li>
          )}
        </ShimmerRepeat>
      </ul>
    </div>
  )
}

export function PizzaCategoriaRegraPrecoStep({
  draft,
  onChange,
}: PizzaCategoriaRegraPrecoStepProps) {
  const [impressoras, setImpressoras] = useState<ImpressoraCatalogItem[]>([])
  const [loadingImpressoras, setLoadingImpressoras] = useState(true)
  const [impressorasError, setImpressorasError] = useState<string | null>(null)

  const fetchImpressoras = useCallback(async () => {
    setLoadingImpressoras(true)
    setImpressorasError(null)
    try {
      const limit = 100
      let offset = 0
      let hasMore = true
      const collected: ImpressoraCatalogItem[] = []

      while (hasMore) {
        const response = await fetchGestorApi(`/api/impressoras?limit=${limit}&offset=${offset}`, {
          headers: { 'Content-Type': 'application/json' },
        })

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw new Error(data.error || data.message || 'Erro ao carregar impressoras')
        }

        const data = await response.json()
        const items: ImpressoraCatalogItem[] = (data.items || [])
          .map((item: { id?: string; nome?: string }) => ({
            id: item.id?.toString() || '',
            nome: item.nome?.toString() || 'Impressora',
          }))
          .filter((item: ImpressoraCatalogItem) => Boolean(item.id))

        collected.push(...items)

        const fetchedCount = items.length
        const totalCount = data.count ?? collected.length
        offset += fetchedCount
        hasMore = fetchedCount === limit && collected.length < totalCount
      }

      collected.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      setImpressoras(collected)
    } catch (error) {
      setImpressorasError(error instanceof Error ? error.message : 'Erro ao carregar impressoras')
      setImpressoras([])
    } finally {
      setLoadingImpressoras(false)
    }
  }, [])

  useEffect(() => {
    void fetchImpressoras()
  }, [fetchImpressoras])

  const selectedImpressoras = new Set(draft.impressorasIds)

  const toggleImpressora = (id: string, checked: boolean) => {
    const next = checked
      ? [...draft.impressorasIds, id]
      : draft.impressorasIds.filter(impressoraId => impressoraId !== id)
    onChange({ ...draft, impressorasIds: next })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden bg-[#EEF2F6] p-3 md:p-4">
      <section className="shrink-0 rounded-xl border border-gray-100 bg-white px-3 py-2.5 shadow-sm">
        <h2 className="text-sm font-semibold text-primary-text">
          Quando a pizza tem mais de um sabor
        </h2>
        <RadioGroup
          className="mt-1"
          value={draft.regraPrecoMultiplosSabores}
          onChange={e =>
            onChange({
              ...draft,
              regraPrecoMultiplosSabores: e.target
                .value as PizzaCategoriaDraft['regraPrecoMultiplosSabores'],
            })
          }
          sx={{
            gap: 0,
            '& .MuiFormControlLabel-root': { marginY: 0, alignItems: 'flex-start' },
            '& .MuiRadio-root': { paddingTop: '2px', paddingBottom: '2px' },
          }}
        >
          <FormControlLabel
            value="proporcional"
            control={<Radio size="small" />}
            label={
              <div className="leading-tight">
                <p className="text-sm font-medium text-primary-text">Proporcional</p>
                <p className="text-xs text-secondary-text">
                  Cobra a média dos sabores escolhidos
                </p>
              </div>
            }
          />
          <FormControlLabel
            value="maior"
            control={<Radio size="small" />}
            label={
              <div className="leading-tight">
                <p className="text-sm font-medium text-primary-text">Maior valor</p>
                <p className="text-xs text-secondary-text">Cobra o sabor mais caro</p>
              </div>
            }
          />
        </RadioGroup>
      </section>

      <section className="shrink-0 rounded-xl border border-gray-100 bg-white px-3 py-2.5 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-primary-text">Comportamento na venda</h2>
        <div className="flex flex-col">
          <JiffyIconSwitch
            checked={draft.permiteDesconto}
            onChange={e => onChange({ ...draft, permiteDesconto: e.target.checked })}
            label={
              <span className="text-sm font-medium text-primary-text">Permite desconto</span>
            }
            labelPosition="start"
            bordered={false}
            size="sm"
            className="w-full justify-between py-0.5"
            inputProps={{ 'aria-label': 'Permite desconto' }}
          />
          <JiffyIconSwitch
            checked={draft.permiteAcrescimo}
            onChange={e => onChange({ ...draft, permiteAcrescimo: e.target.checked })}
            label={
              <span className="text-sm font-medium text-primary-text">Permite acréscimo</span>
            }
            labelPosition="start"
            bordered={false}
            size="sm"
            className="w-full justify-between py-0.5"
            inputProps={{ 'aria-label': 'Permite acréscimo' }}
          />
        </div>
      </section>

      <section className="flex min-h-0 flex-1 flex-col rounded-xl border border-gray-100 bg-white px-3 py-2.5 shadow-sm">
        <h2 className="mb-1 shrink-0 text-sm font-semibold text-primary-text">
          Impressoras que recebem esta categoria
        </h2>

        {loadingImpressoras ? (
          <ImpressorasListSkeleton />
        ) : impressorasError ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 py-6">
            <p className="text-center text-sm text-error">{impressorasError}</p>
            <button
              type="button"
              onClick={() => void fetchImpressoras()}
              className="text-sm font-semibold text-primary hover:underline"
            >
              Tentar novamente
            </button>
          </div>
        ) : impressoras.length === 0 ? (
          <p className="py-6 text-center text-sm text-secondary-text">
            Nenhuma impressora cadastrada.
          </p>
        ) : (
          <div className={cn('min-h-0 flex-1 overflow-y-auto pr-1', SCROLLBAR_BRANCA)}>
            <ul className="flex flex-col gap-1">
              {impressoras.map(impressora => (
                <li key={impressora.id}>
                  <JiffyIconSwitch
                    checked={selectedImpressoras.has(impressora.id)}
                    onChange={e => toggleImpressora(impressora.id, e.target.checked)}
                    label={
                      <span className="text-sm font-medium text-primary-text">
                        {impressora.nome}
                      </span>
                    }
                    labelPosition="start"
                    bordered={false}
                    size="sm"
                    className="w-full justify-between py-0.5"
                    inputProps={{
                      'aria-label': `Impressora ${impressora.nome}`,
                    }}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  )
}
