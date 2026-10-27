'use client'

import { useCallback, useEffect, useState } from 'react'
import { TextField } from '@mui/material'
import { MdCheck } from 'react-icons/md'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import { Shimmer, ShimmerRepeat } from '@/src/presentation/components/ui/shimmer'
import { IconPickerPanel } from '@/src/presentation/components/features/grupos-produtos/IconPickerPanel'
import { sxEntradaCompactaProduto } from '@/src/presentation/components/features/produtos/NovoProduto/produtoFormMuiSx'
import { cn } from '@/src/shared/utils/cn'
import type { PizzaCategoriaDraft } from './pizzaDefaults'

const SCROLLBAR_BRANCA =
  '[scrollbar-color:white_white] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-white [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white [&::-webkit-scrollbar-thumb:hover]:bg-white'

const CORES_SKELETON_ITENS = 15

function CoresGridSkeleton() {
  return (
    <div
      className="min-h-0 flex-1 overflow-hidden"
      aria-busy="true"
      aria-label="Carregando cores"
    >
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
        <ShimmerRepeat count={CORES_SKELETON_ITENS}>
          {index => (
            <div
              key={index}
              className="relative mx-auto aspect-square w-full max-w-[4.5rem] overflow-hidden rounded-xl"
            >
              <Shimmer
                variant="rectangular"
                width="100%"
                height="100%"
                sx={{ position: 'absolute', inset: 0, borderRadius: '0.75rem' }}
              />
            </div>
          )}
        </ShimmerRepeat>
      </div>
    </div>
  )
}

interface PizzaCategoriaInformacoesStepProps {
  draft: PizzaCategoriaDraft
  onChange: (draft: PizzaCategoriaDraft) => void
}

function normalizeHexColor(value: string): string {
  if (!value) return '#CCCCCC'
  let hex = value.trim().replace('#', '')
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map(char => char + char)
      .join('')
  }
  if (hex.length === 8) {
    hex = hex.slice(2)
  }
  if (hex.length !== 6) return '#CCCCCC'
  return `#${hex.toUpperCase()}`
}

export function PizzaCategoriaInformacoesStep({
  draft,
  onChange,
}: PizzaCategoriaInformacoesStepProps) {
  const [colors, setColors] = useState<string[]>([])
  const [loadingColors, setLoadingColors] = useState(true)
  const [colorsError, setColorsError] = useState<string | null>(null)

  const fetchColors = useCallback(async () => {
    setLoadingColors(true)
    setColorsError(null)
    try {
      const response = await fetchGestorApi('/api/preferencias/cores-disponiveis', {
        headers: { 'Content-Type': 'application/json' },
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || 'Erro ao carregar cores')
      }
      const data = await response.json()
      const lista = Array.isArray(data) ? data : Array.isArray(data?.cores) ? data.cores : []
      setColors(
        lista
          .map((cor: string) => normalizeHexColor(cor))
          .filter((cor: string, index: number, arr: string[]) => cor && arr.indexOf(cor) === index)
      )
    } catch (error) {
      setColorsError(error instanceof Error ? error.message : 'Erro ao carregar cores')
      setColors([])
    } finally {
      setLoadingColors(false)
    }
  }, [])

  useEffect(() => {
    void fetchColors()
  }, [fetchColors])

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-6 lg:overflow-hidden">
      <p className="shrink-0 text-sm text-secondary-text">
        Essas informações identificam a categoria no Jiffy PDV.
      </p>

      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <TextField
            label="Nome da categoria"
            required
            fullWidth
            value={draft.nome}
            onChange={e => onChange({ ...draft, nome: e.target.value.toUpperCase() })}
            sx={sxEntradaCompactaProduto}
          />
        </div>
        <div className="flex shrink-0 items-center gap-3 px-1 py-2">
          <span className="text-sm font-medium text-primary-text">Status</span>
          <JiffyIconSwitch
            checked={draft.ativo}
            onChange={e => onChange({ ...draft, ativo: e.target.checked })}
            size="sm"
            inputProps={{ 'aria-label': 'Categoria ativa' }}
          />
        </div>
      </div>

      <section className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="shrink-0">
          <h2 className="text-base font-semibold text-primary-text">Aparência</h2>
          <p className="mt-1 text-sm text-secondary-text">
            Escolha como a categoria será exibida no lançamento da venda.
          </p>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2 lg:grid-rows-1">
          <div className="flex min-h-[220px] flex-col rounded-xl border border-gray-200 bg-white p-3 md:p-4 lg:min-h-0">
            {loadingColors ? (
              <CoresGridSkeleton />
            ) : colorsError ? (
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2">
                <p className="text-center text-sm text-error">{colorsError}</p>
                <button
                  type="button"
                  onClick={() => void fetchColors()}
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  Tentar novamente
                </button>
              </div>
            ) : colors.length === 0 ? (
              <p className="flex min-h-0 flex-1 items-center justify-center text-center text-sm text-secondary-text">
                Nenhuma cor disponível no momento.
              </p>
            ) : (
              <div className={cn('min-h-0 flex-1 overflow-y-auto pr-1', SCROLLBAR_BRANCA)}>
                <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
                  {colors.map(color => {
                    const selected = normalizeHexColor(draft.corHex) === color
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => onChange({ ...draft, corHex: color })}
                        className={cn(
                          'relative aspect-square w-full max-w-[4.5rem] mx-auto flex items-center justify-center rounded-xl border-2 transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                          selected ? 'border-primary-text' : 'border-transparent'
                        )}
                        style={{ backgroundColor: color }}
                        aria-label={`Selecionar a cor ${color}`}
                        aria-pressed={selected}
                      >
                        {selected ? (
                          <MdCheck className="text-white drop-shadow" size={22} aria-hidden />
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex min-h-[280px] flex-col rounded-xl border border-gray-200 bg-white p-3 md:p-4 lg:min-h-0">
            <IconPickerPanel
              enabled
              dense
              fillAvailable
              loadingUI="skeleton"
              gridClassName="grid grid-cols-5 gap-1 md:gap-2"
              scrollAreaClassName={SCROLLBAR_BRANCA}
              selectedColor={draft.corHex}
              selectionColor="var(--color-primary)"
              selectedIconName={draft.iconName}
              variant="inline"
              className="min-h-0"
              onSelect={iconName => onChange({ ...draft, iconName })}
            />
          </div>
        </div>
      </section>
    </div>
  )
}
