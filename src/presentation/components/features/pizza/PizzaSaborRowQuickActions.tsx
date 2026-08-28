'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { Checkbox, FormControlLabel, Popover, TextField, Tooltip } from '@mui/material'
import { MdNotes } from 'react-icons/md'
import { GiFullPizza } from 'react-icons/gi'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { sxEntradaCompactaProduto } from '@/src/presentation/components/features/produtos/NovoProduto/produtoFormMuiSx'
import {
  usePizzaSabor,
  usePizzaTamanhos,
} from '@/src/presentation/hooks/pizza/usePizza'
import { cn } from '@/src/shared/utils/cn'
import type { PrecoSaborTamanhoInput, SaborPizzaSummary } from '@/src/shared/types/pizza'
import { PizzaCurrencyTextField } from './PizzaCurrencyTextField'

const ROW_ICON_BTN =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-secondary/60 bg-white text-secondary transition-colors hover:bg-secondary/10'

type PrecoTamanhoCfg = { enabled: boolean; valor: number }

function patchPrecoTamanho(
  prev: Record<string, PrecoTamanhoCfg>,
  tamanhoId: string,
  patch: Partial<PrecoTamanhoCfg>,
  fallback: PrecoTamanhoCfg
): Record<string, PrecoTamanhoCfg> {
  return {
    ...prev,
    [tamanhoId]: {
      ...(prev[tamanhoId] ?? fallback),
      ...patch,
    },
  }
}

function buildPrecosSelecionados(precos: Record<string, PrecoTamanhoCfg>): PrecoSaborTamanhoInput[] {
  return Object.entries(precos)
    .filter(([, cfg]) => cfg.enabled && cfg.valor > 0)
    .map(([pizzaTamanhoId, cfg]) => ({
      pizzaTamanhoId,
      precoCheio: cfg.valor,
    }))
}

function serializePrecos(precos: PrecoSaborTamanhoInput[]): string {
  return JSON.stringify(
    [...precos].sort((a, b) => a.pizzaTamanhoId.localeCompare(b.pizzaTamanhoId))
  )
}

function RowIconButton({
  title,
  active,
  onClick,
  disabled,
  borderless = false,
  className,
  children,
}: {
  title: string
  active?: boolean
  onClick: (e: MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
  borderless?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <Tooltip title={title} arrow placement="top">
      <button
        type="button"
        disabled={disabled}
        onClick={e => {
          e.stopPropagation()
          onClick(e)
        }}
        className={cn(
          borderless
            ? 'flex h-8 w-9 shrink-0 items-center justify-center bg-transparent transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50'
            : ROW_ICON_BTN,
          !borderless && active && 'border-secondary bg-secondary text-white hover:bg-secondary',
          className
        )}
      >
        {children}
      </button>
    </Tooltip>
  )
}

function PizzaTamanhosIcon({ active }: { active?: boolean }) {
  return (
    <GiFullPizza
      className={cn('h-8 w-8 shrink-0', active ? 'text-secondary' : 'text-secondary/85')}
      aria-hidden
    />
  )
}

export interface PizzaSaborRowQuickActionsProps {
  sabor: SaborPizzaSummary
  categoriaPizzaId: string
  tamanhosComPreco: number
  tamanhosTotal: number
  disabled?: boolean
  onPatchDescricao: (saborId: string, descricao: string | null) => boolean | Promise<boolean>
  onPatchPrecosTamanho: (
    saborId: string,
    precosTamanho: PrecoSaborTamanhoInput[]
  ) => boolean | Promise<boolean>
}

/** Ícones rápidos (descrição, tamanhos/preços) na lista de sabores pizza. */
export function PizzaSaborRowQuickActions({
  sabor,
  categoriaPizzaId,
  tamanhosComPreco,
  tamanhosTotal,
  disabled,
  onPatchDescricao,
  onPatchPrecosTamanho,
}: PizzaSaborRowQuickActionsProps) {
  const [descricao, setDescricao] = useState(sabor.descricao ?? '')
  const [descAnchor, setDescAnchor] = useState<HTMLElement | null>(null)
  const [tamanhosAnchor, setTamanhosAnchor] = useState<HTMLElement | null>(null)
  const [localPrecos, setLocalPrecos] = useState<Record<string, PrecoTamanhoCfg>>({})
  const localPrecosRef = useRef(localPrecos)
  const [initialPrecosKey, setInitialPrecosKey] = useState('')
  const [salvandoPrecos, setSalvandoPrecos] = useState(false)

  useEffect(() => {
    localPrecosRef.current = localPrecos
  }, [localPrecos])

  const tamanhosPopoverOpen = Boolean(tamanhosAnchor)
  const { data: saborDetalhe, isLoading: loadingSabor } = usePizzaSabor(
    sabor.id,
    tamanhosPopoverOpen
  )
  const { data: tamanhosData, isLoading: loadingTamanhos } = usePizzaTamanhos(
    categoriaPizzaId,
    tamanhosPopoverOpen
  )
  const tamanhos = tamanhosData?.items ?? []

  useEffect(() => {
    setDescricao(sabor.descricao ?? '')
  }, [sabor.descricao])

  useEffect(() => {
    if (!tamanhosPopoverOpen || !saborDetalhe || tamanhos.length === 0) return

    const map: Record<string, PrecoTamanhoCfg> = {}
    for (const tamanho of tamanhos) {
      const existing = saborDetalhe.precosTamanho.find(p => p.pizzaTamanhoId === tamanho.id)
      map[tamanho.id] = existing
        ? { enabled: existing.precoCheio > 0, valor: existing.precoCheio }
        : { enabled: false, valor: 0 }
    }

    setLocalPrecos(map)
    localPrecosRef.current = map
    setInitialPrecosKey(serializePrecos(buildPrecosSelecionados(map)))
  }, [tamanhosPopoverOpen, saborDetalhe, tamanhos])

  const atualizarPrecoTamanho = useCallback((tamanhoId: string, patch: Partial<PrecoTamanhoCfg>) => {
    setLocalPrecos(prev => {
      const next = patchPrecoTamanho(prev, tamanhoId, patch, { enabled: false, valor: 0 })
      localPrecosRef.current = next
      return next
    })
  }, [])

  const revertLocalPrecos = useCallback(() => {
    if (!saborDetalhe) return
    const map: Record<string, PrecoTamanhoCfg> = {}
    for (const tamanho of tamanhos) {
      const existing = saborDetalhe.precosTamanho.find(p => p.pizzaTamanhoId === tamanho.id)
      map[tamanho.id] = existing
        ? { enabled: existing.precoCheio > 0, valor: existing.precoCheio }
        : { enabled: false, valor: 0 }
    }
    setLocalPrecos(map)
    localPrecosRef.current = map
  }, [saborDetalhe, tamanhos])

  const persistPrecosTamanho = useCallback(async () => {
    if (!initialPrecosKey || salvandoPrecos) return

    const selecionados = buildPrecosSelecionados(localPrecosRef.current)
    const nextKey = serializePrecos(selecionados)
    if (nextKey === initialPrecosKey) return

    setSalvandoPrecos(true)
    try {
      const ok = await onPatchPrecosTamanho(sabor.id, selecionados)
      if (ok) {
        setInitialPrecosKey(nextKey)
      } else {
        revertLocalPrecos()
      }
    } finally {
      setSalvandoPrecos(false)
    }
  }, [
    initialPrecosKey,
    onPatchPrecosTamanho,
    revertLocalPrecos,
    salvandoPrecos,
    sabor.id,
  ])

  const fecharDescricao = () => {
    setDescAnchor(null)
    const next = descricao.trim() || null
    const prev = (sabor.descricao ?? '').trim() || null
    if (next === prev) return
    void (async () => {
      const ok = await onPatchDescricao(sabor.id, next)
      if (!ok) setDescricao(sabor.descricao ?? '')
    })()
  }

  const fecharTamanhos = () => {
    void persistPrecosTamanho()
    setTamanhosAnchor(null)
  }

  const salvarPrecosSemFechar = () => {
    void persistPrecosTamanho()
  }

  const tamanhosComPrecoLocal = useMemo(
    () => buildPrecosSelecionados(localPrecos).length,
    [localPrecos]
  )

  const badgeCount = tamanhosPopoverOpen ? tamanhosComPrecoLocal : tamanhosComPreco

  const tamanhosLabel =
    tamanhosTotal > 0
      ? `${badgeCount} de ${tamanhosTotal} tamanho${tamanhosTotal === 1 ? '' : 's'}`
      : 'Configurar tamanhos'

  const loadingPopover = tamanhosPopoverOpen && (loadingSabor || loadingTamanhos)
  const camposDesabilitados = disabled || salvandoPrecos

  return (
    <>
      <div className="flex shrink-0 items-center gap-1">
        <RowIconButton
          title={descricao.trim() ? 'Editar descrição' : 'Adicionar descrição'}
          active={Boolean(descricao.trim())}
          disabled={disabled}
          onClick={e => setDescAnchor(e.currentTarget)}
        >
          <MdNotes className="text-lg" />
        </RowIconButton>
        <RowIconButton
          title={tamanhosLabel}
          active={badgeCount > 0}
          disabled={disabled || tamanhosTotal === 0}
          borderless
          onClick={e => setTamanhosAnchor(e.currentTarget)}
        >
          <span className="relative flex items-center justify-center">
            <PizzaTamanhosIcon active={badgeCount > 0} />
            {tamanhosTotal > 0 ? (
              <span className="absolute -right-0.5 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-secondary px-0.5 text-[9px] font-bold leading-none text-white">
                {badgeCount}
              </span>
            ) : null}
          </span>
        </RowIconButton>
      </div>

      <Popover
        open={Boolean(descAnchor)}
        anchorEl={descAnchor}
        onClose={fecharDescricao}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <div className="w-[min(420px,92vw)] p-3" onClick={e => e.stopPropagation()}>
          <p className="mb-2 text-xs font-semibold text-primary-text">Descrição do sabor</p>
          <TextField
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
            disabled={disabled}
            multiline
            minRows={3}
            fullWidth
            size="small"
            placeholder="Ingredientes ou observações exibidas ao cliente"
          />
        </div>
      </Popover>

      <Popover
        open={tamanhosPopoverOpen}
        anchorEl={tamanhosAnchor}
        onClose={fecharTamanhos}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <div className="w-[min(420px,92vw)] p-3" onClick={e => e.stopPropagation()}>
          <p className="mb-1 text-xs font-semibold text-primary-text">Tamanhos e preços</p>
          <p className="mb-3 text-[11px] text-secondary-text">
            Marque os tamanhos disponíveis e informe o preço de cada um.
          </p>

          {loadingPopover ? (
            <JiffyLoading text="Carregando tamanhos..." className="py-4" />
          ) : tamanhos.length === 0 ? (
            <p className="text-sm text-secondary-text">
              Configure os tamanhos da categoria antes de definir preços.
            </p>
          ) : (
            <div className="flex max-h-[min(360px,50vh)] flex-col gap-2 overflow-y-auto pr-1">
              {tamanhos.map(tamanho => {
                const cfg = localPrecos[tamanho.id] ?? { enabled: false, valor: 0 }
                return (
                  <div
                    key={tamanho.id}
                    className="rounded-lg border border-gray-200 bg-gray-50/80 p-3"
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          size="small"
                          checked={cfg.enabled}
                          disabled={camposDesabilitados}
                          onChange={e =>
                            atualizarPrecoTamanho(tamanho.id, { enabled: e.target.checked })
                          }
                        />
                      }
                      label={
                        <span className="text-sm font-medium text-primary-text">{tamanho.nome}</span>
                      }
                    />
                    <PizzaCurrencyTextField
                      size="small"
                      fullWidth
                      label="Preço"
                      disabled={camposDesabilitados || !cfg.enabled}
                      value={cfg.valor}
                      onChange={valor => atualizarPrecoTamanho(tamanho.id, { valor })}
                      onEnter={salvarPrecosSemFechar}
                      sx={sxEntradaCompactaProduto}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </Popover>
    </>
  )
}
