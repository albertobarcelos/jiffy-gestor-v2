'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { Autocomplete, Popover, TextField, Tooltip } from '@mui/material'
import {
  MdImageNotSupported,
  MdList,
  MdNotes,
  MdStar,
  MdStarBorder,
} from 'react-icons/md'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { sxEntradaCompactaProduto } from '@/src/presentation/components/features/produtos/NovoProduto/produtoFormMuiSx'
import { ProdutoValorInput } from '@/src/presentation/components/features/produtos/ProdutosList/ProdutoValorInput'
import { ProdutoStatusSwitch } from '@/src/presentation/components/features/produtos/ProdutosList/ProdutoStatusSwitch'
import { cn } from '@/src/shared/utils/cn'
import { useMenuProduto } from '@/src/presentation/hooks/menus/useMenuProduto'
import { useMenuMutations } from '@/src/presentation/hooks/menus/useMenuMutations'
import { useGruposProdutos } from '@/src/presentation/hooks/useGruposProdutos'
import { useGruposComplementos } from '@/src/presentation/hooks/useGruposComplementos'
import { showToast } from '@/src/shared/utils/toast'
import type { UpdateMenuProdutoInput } from '@/src/shared/types/menus'
import type {
  DestinoAlteracaoProduto,
  SnapshotProdutoPropagavel,
} from '@/src/shared/types/propagarAlteracaoProduto'
import type { GrupoComplemento } from '@/src/domain/entities/GrupoComplemento'
import type { GrupoProduto } from '@/src/domain/entities/GrupoProduto'
import {
  formatMenuProdutoCurrency,
  parseMenuProdutoCurrency,
} from './menuProdutoFormUtils'

export type ProdutoMenuVinculoFormHandle = {
  isDirty: () => boolean
  save: () => Promise<boolean>
}

interface ProdutoMenuVinculoFormProps {
  menuId: string
  produtoId: string
  enabled: boolean
  /** Repassa o menuId junto para evitar callback instável no pai. */
  dirtyMenuId?: string
  onDirtyChange?: (menuId: string, dirty: boolean) => void
  pedirConfirmacao: (opts: {
    origem: 'menu'
    produtoId: string
    menuIdAtual?: string
  }) => Promise<DestinoAlteracaoProduto | null>
  aplicarNosDestinos: (params: {
    produtoId: string
    snapshot: SnapshotProdutoPropagavel
    destinos: DestinoAlteracaoProduto
  }) => Promise<void>
}

function sameIdList(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false
  const sa = [...a].sort()
  const sb = [...b].sort()
  return sa.every((id, i) => id === sb[i])
}

const ROW_ICON_BTN =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-secondary/60 bg-white text-secondary transition-colors hover:bg-secondary/10'

function RowIconButton({
  title,
  active,
  onClick,
  disabled,
  children,
}: {
  title: string
  active?: boolean
  onClick: (e: MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
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
          ROW_ICON_BTN,
          active && 'border-secondary bg-secondary text-white hover:bg-secondary'
        )}
      >
        {children}
      </button>
    </Tooltip>
  )
}

/**
 * Formulário editável do snapshot do produto em um cardápio (aba Menus).
 */
export const ProdutoMenuVinculoForm = forwardRef<
  ProdutoMenuVinculoFormHandle,
  ProdutoMenuVinculoFormProps
>(function ProdutoMenuVinculoForm(
  {
    menuId,
    produtoId,
    enabled,
    dirtyMenuId,
    onDirtyChange,
    pedirConfirmacao,
    aplicarNosDestinos,
  },
  ref
) {
  const { data, isLoading, isError, error, refetch } = useMenuProduto(
    menuId,
    produtoId,
    enabled
  )
  const { updateProduto } = useMenuMutations(menuId)
  const { data: gruposProdutos = [], isLoading: loadingGrupos } = useGruposProdutos({
    limit: 100,
    ativo: null,
    enabled,
  })
  const { data: gruposComplementos = [], isLoading: loadingComplementos } =
    useGruposComplementos({ limit: 100, ativo: null })

  const baselineRef = useRef<{
    nome: string
    descricao: string
    valor: number
    ativo: boolean
    favorito: boolean
    grupoProdutoId: string
    gruposComplementosIds: string[]
  } | null>(null)

  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [ativo, setAtivo] = useState(true)
  const [favorito, setFavorito] = useState(false)
  const [grupoProdutoId, setGrupoProdutoId] = useState<string | null>(null)
  const [gruposComplementosIds, setGruposComplementosIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [complAnchor, setComplAnchor] = useState<HTMLElement | null>(null)
  const [descAnchor, setDescAnchor] = useState<HTMLElement | null>(null)

  const valorNumerico = useMemo(() => parseMenuProdutoCurrency(valor) || 0, [valor])

  const syncFromData = useCallback((next: NonNullable<typeof data>) => {
    const baseline = {
      nome: next.nome,
      descricao: next.descricao ?? '',
      valor: Number(next.valor),
      ativo: next.ativo,
      favorito: next.favorito,
      grupoProdutoId: next.grupoProduto?.id ?? '',
      gruposComplementosIds: (next.gruposComplementos ?? []).map(g => g.id).filter(Boolean),
    }
    baselineRef.current = baseline
    setNome(baseline.nome)
    setDescricao(baseline.descricao)
    setValor(formatMenuProdutoCurrency(String(Math.round(baseline.valor * 100))))
    setAtivo(baseline.ativo)
    setFavorito(baseline.favorito)
    setGrupoProdutoId(baseline.grupoProdutoId || null)
    setGruposComplementosIds(baseline.gruposComplementosIds)
  }, [])

  const grupoSelecionado = useMemo(
    () => gruposProdutos.find(g => g.getId() === grupoProdutoId) ?? null,
    [gruposProdutos, grupoProdutoId]
  )

  const complementosSelecionados = useMemo(
    () => gruposComplementos.filter(g => gruposComplementosIds.includes(g.getId())),
    [gruposComplementos, gruposComplementosIds]
  )

  const gruposComplementosOpcoes = useMemo(() => {
    const seen = new Set<string>()
    return gruposComplementos.filter(g => {
      const id = g.getId()
      if (!id || seen.has(id)) return false
      seen.add(id)
      return true
    })
  }, [gruposComplementos])

  const isDirty = useCallback(() => {
    const base = baselineRef.current
    if (!base) return false
    const valorNum = parseMenuProdutoCurrency(valor)
    return (
      nome.trim() !== base.nome ||
      descricao.trim() !== base.descricao.trim() ||
      (Number.isFinite(valorNum) ? valorNum : -1) !== base.valor ||
      ativo !== base.ativo ||
      favorito !== base.favorito ||
      (grupoProdutoId ?? '') !== base.grupoProdutoId ||
      !sameIdList(gruposComplementosIds, base.gruposComplementosIds)
    )
  }, [nome, descricao, valor, ativo, favorito, grupoProdutoId, gruposComplementosIds])

  const dirtyRef = useRef(false)
  const lastReportedDirtyRef = useRef<boolean | null>(null)
  const onDirtyChangeRef = useRef(onDirtyChange)
  onDirtyChangeRef.current = onDirtyChange
  const dirtyTargetMenuId = dirtyMenuId ?? menuId

  useEffect(() => {
    const dirty = isDirty()
    dirtyRef.current = dirty
    if (lastReportedDirtyRef.current === dirty) return
    lastReportedDirtyRef.current = dirty
    onDirtyChangeRef.current?.(dirtyTargetMenuId, dirty)
  }, [isDirty, dirtyTargetMenuId])

  useEffect(() => {
    lastReportedDirtyRef.current = null
  }, [dirtyTargetMenuId, produtoId])

  useEffect(() => {
    if (data && !dirtyRef.current) syncFromData(data)
  }, [data, syncFromData])

  const save = useCallback(async (): Promise<boolean> => {
    if (!isDirty()) return true
    const base = baselineRef.current
    if (!base) return false

    const nomeTrim = nome.trim()
    const valorNum = parseMenuProdutoCurrency(valor)
    if (!nomeTrim) {
      showToast.error('Informe o nome no cardápio')
      return false
    }
    if (!Number.isFinite(valorNum) || valorNum <= 0) {
      showToast.error('Informe um preço válido')
      return false
    }
    if (!grupoProdutoId) {
      showToast.error('Selecione a categoria')
      return false
    }

    const destinos = await pedirConfirmacao({
      origem: 'menu',
      produtoId,
      menuIdAtual: menuId,
    })
    if (destinos === null) return false

    const snapshot: SnapshotProdutoPropagavel = {
      nome: nomeTrim,
      descricao: descricao.trim() || null,
      valor: valorNum,
      ativo,
      favorito,
      grupoProdutoId,
      gruposComplementosIds: [...gruposComplementosIds],
    }

    const patch: UpdateMenuProdutoInput = {
      nome: snapshot.nome,
      descricao: snapshot.descricao,
      valor: snapshot.valor,
      ativo: snapshot.ativo,
      favorito: snapshot.favorito,
      grupoProdutoId: snapshot.grupoProdutoId,
      gruposComplementosIds: snapshot.gruposComplementosIds,
    }

    setSaving(true)
    try {
      await updateProduto.mutateAsync({ produtoId, input: patch })
      if (destinos.aplicarNoCadastroBase || destinos.menuIds.length > 0) {
        await aplicarNosDestinos({ produtoId, snapshot, destinos })
      }
      baselineRef.current = {
        nome: nomeTrim,
        descricao: descricao.trim(),
        valor: valorNum,
        ativo,
        favorito,
        grupoProdutoId,
        gruposComplementosIds: [...gruposComplementosIds],
      }
      onDirtyChangeRef.current?.(dirtyTargetMenuId, false)
      lastReportedDirtyRef.current = false
      dirtyRef.current = false
      return true
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : 'Erro ao salvar neste cardápio')
      return false
    } finally {
      setSaving(false)
    }
  }, [
    isDirty,
    nome,
    valor,
    descricao,
    ativo,
    favorito,
    grupoProdutoId,
    gruposComplementosIds,
    produtoId,
    menuId,
    pedirConfirmacao,
    aplicarNosDestinos,
    updateProduto,
  ])

  useImperativeHandle(ref, () => ({ isDirty, save }), [isDirty, save])

  if (!enabled) return null

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <JiffyLoading />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="space-y-2 px-1 py-3 text-xs text-secondary-text">
        <p>{error?.message || 'Não foi possível carregar os dados deste cardápio.'}</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="font-semibold text-primary hover:underline"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  return (
    <div className="relative border-t border-gray-200/80 py-1">
      {saving ? (
        <div className="absolute right-2 top-1 z-10 text-[10px] text-secondary-text">Salvando…</div>
      ) : null}
      <div
        className="flex w-full items-center gap-x-1.5 border border-gray-200 bg-white px-2 py-2 md:gap-x-2 md:px-3"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex min-w-0 flex-1 items-center gap-x-1.5 overflow-hidden md:gap-x-2">
          {data.image?.imageUrl ? (
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-gray-200 md:h-12 md:w-12">
              {/* eslint-disable-next-line @next/next/no-img-element -- snapshot do menu */}
              <img
                src={data.image.imageUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-secondary-text md:h-12 md:w-12"
              aria-hidden
            >
              <MdImageNotSupported className="h-6 w-6" />
            </div>
          )}

          <input
            type="text"
            aria-label="Nome no cardápio"
            value={nome}
            disabled={saving}
            onChange={e => setNome(e.target.value.toLocaleUpperCase('pt-BR'))}
            className="min-w-0 max-w-[30ch] shrink truncate border-0 bg-transparent text-sm font-normal tracking-wide text-primary-text outline-none ring-0 focus:ring-1 focus:ring-primary/40 md:text-base"
          />

          <div className="flex shrink-0 items-center gap-1">
            <div className="hidden w-[9.5rem] shrink-0 md:block">
              <Autocomplete<GrupoProduto, false, false, false>
                size="small"
                options={gruposProdutos}
                loading={loadingGrupos}
                value={grupoSelecionado}
                onChange={(_, value) => setGrupoProdutoId(value?.getId() ?? null)}
                getOptionLabel={option => option.getNome()}
                getOptionKey={option => option.getId()}
                isOptionEqualToValue={(a, b) => a.getId() === b.getId()}
                disabled={saving}
                renderInput={params => (
                  <TextField
                    {...params}
                    placeholder="Categoria"
                    size="small"
                    sx={sxEntradaCompactaProduto}
                  />
                )}
              />
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <RowIconButton
                title={
                  gruposComplementosIds.length > 0
                    ? `Complementos (${gruposComplementosIds.length})`
                    : 'Grupos de complementos'
                }
                active={gruposComplementosIds.length > 0}
                disabled={saving}
                onClick={e => setComplAnchor(e.currentTarget)}
              >
                <MdList className="text-lg" />
              </RowIconButton>
              <RowIconButton
                title={descricao.trim() ? 'Editar descrição' : 'Adicionar descrição'}
                active={Boolean(descricao.trim())}
                disabled={saving}
                onClick={e => setDescAnchor(e.currentTarget)}
              >
                <MdNotes className="text-lg" />
              </RowIconButton>
              <RowIconButton
                title={favorito ? 'Remover dos favoritos' : 'Marcar como favorito'}
                active={favorito}
                disabled={saving}
                onClick={() => setFavorito(v => !v)}
              >
                {favorito ? <MdStar className="text-lg" /> : <MdStarBorder className="text-lg" />}
              </RowIconButton>
            </div>
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2 md:mr-1">
          <ProdutoValorInput
            valor={valorNumerico}
            disabled={saving}
            onCommit={novo =>
              setValor(formatMenuProdutoCurrency(String(Math.round(novo * 100))))
            }
          />
          <ProdutoStatusSwitch
            isAtivo={ativo}
            disabled={saving}
            onChange={setAtivo}
          />
        </div>
      </div>

      <Popover
        open={Boolean(complAnchor)}
        anchorEl={complAnchor}
        onClose={() => setComplAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <div className="w-[min(420px,92vw)] p-3">
          <p className="mb-2 text-xs font-semibold text-primary-text">Grupos de complementos</p>
          <Autocomplete<GrupoComplemento, true, false, false>
            multiple
            size="small"
            options={gruposComplementosOpcoes}
            loading={loadingComplementos}
            value={complementosSelecionados}
            onChange={(_, value) =>
              setGruposComplementosIds(value.map(g => g.getId()).filter(Boolean))
            }
            getOptionLabel={option => option.getNome()}
            getOptionKey={option => option.getId()}
            isOptionEqualToValue={(a, b) => a.getId() === b.getId()}
            disabled={saving}
            renderInput={params => (
              <TextField {...params} placeholder="Selecionar grupos" size="small" />
            )}
          />
        </div>
      </Popover>

      <Popover
        open={Boolean(descAnchor)}
        anchorEl={descAnchor}
        onClose={() => setDescAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <div className="w-[min(420px,92vw)] p-3">
          <p className="mb-2 text-xs font-semibold text-primary-text">Descrição neste cardápio</p>
          <TextField
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
            disabled={saving}
            multiline
            minRows={3}
            fullWidth
            size="small"
            placeholder="Descrição exibida neste menu"
          />
        </div>
      </Popover>

      <div className="mt-1 px-1 md:hidden">
        <Autocomplete<GrupoProduto, false, false, false>
          size="small"
          options={gruposProdutos}
          loading={loadingGrupos}
          value={grupoSelecionado}
          onChange={(_, value) => setGrupoProdutoId(value?.getId() ?? null)}
          getOptionLabel={option => option.getNome()}
          getOptionKey={option => option.getId()}
          isOptionEqualToValue={(a, b) => a.getId() === b.getId()}
          disabled={saving}
          renderInput={params => (
            <TextField {...params} placeholder="Categoria" size="small" sx={sxEntradaCompactaProduto} />
          )}
        />
      </div>
    </div>
  )
})
