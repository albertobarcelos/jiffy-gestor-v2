'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
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
  MdModeEdit,
  MdNotes,
  MdStar,
  MdStarBorder,
} from 'react-icons/md'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { ProdutoValorInput } from '@/src/presentation/components/features/produtos/ProdutosList/ProdutoValorInput'
import { ProdutoStatusSwitch } from '@/src/presentation/components/features/produtos/ProdutosList/ProdutoStatusSwitch'
import { DinamicIcon } from '@/src/shared/utils/iconRenderer'
import { cn } from '@/src/shared/utils/cn'
import { useMenuProduto } from '@/src/presentation/hooks/menus/useMenuProduto'
import { useLocaleUppercaseInputHandler } from '@/src/presentation/hooks/useLocaleUppercaseInputHandler'
import { useMenuMutations } from '@/src/presentation/hooks/menus/useMenuMutations'
import { useGruposProdutos } from '@/src/presentation/hooks/useGruposProdutos'
import { useGruposComplementos } from '@/src/presentation/hooks/useGruposComplementos'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { showToast } from '@/src/shared/utils/toast'
import type { UpdateMenuProdutoInput } from '@/src/shared/types/menus'
import type {
  DestinoAlteracaoProduto,
  SnapshotProdutoPropagavel,
} from '@/src/shared/types/propagarAlteracaoProduto'
import type { GrupoComplemento } from '@/src/domain/entities/GrupoComplemento'
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

const CATEGORIA_INPUT_FOLGA_PX = 40
const CATEGORIA_INPUT_MIN_PX = 56
const CATEGORIA_INPUT_TEXT_CLASS =
  'text-sm font-semibold tracking-wide text-primary-text md:text-base'

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
  const invalidate = useInvalidateTenantQueries()
  const { data, isLoading, isError, error, refetch } = useMenuProduto(
    menuId,
    produtoId,
    enabled
  )
  const { updateProduto, renameGrupo } = useMenuMutations(menuId)
  const { data: gruposProdutos = [] } = useGruposProdutos({
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
    gruposComplementosIds: string[]
  } | null>(null)

  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [ativo, setAtivo] = useState(true)
  const [favorito, setFavorito] = useState(false)
  const [gruposComplementosIds, setGruposComplementosIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [complAnchor, setComplAnchor] = useState<HTMLElement | null>(null)
  const [descAnchor, setDescAnchor] = useState<HTMLElement | null>(null)
  const [categoriaNome, setCategoriaNome] = useState('')
  const [editandoCategoria, setEditandoCategoria] = useState(false)
  const [savingCategoria, setSavingCategoria] = useState(false)
  const [categoriaInputWidthPx, setCategoriaInputWidthPx] = useState(CATEGORIA_INPUT_MIN_PX)
  const categoriaSizerRef = useRef<HTMLSpanElement>(null)
  const categoriaNomeSalvoRef = useRef('')
  const bloqueiaBlurCategoriaRef = useRef(false)
  const { inputRef: categoriaInputRef, handleChange: handleCategoriaNomeChange } =
    useLocaleUppercaseInputHandler(categoriaNome, setCategoriaNome)
  const { inputRef: nomeCardapioInputRef, handleChange: handleNomeChange } =
    useLocaleUppercaseInputHandler(nome, setNome)

  const valorNumerico = useMemo(() => parseMenuProdutoCurrency(valor) || 0, [valor])
  const grupoProdutoId = data?.grupoProduto?.id ?? ''

  const grupoVisual = useMemo(() => {
    const grupo = gruposProdutos.find(g => g.getId() === grupoProdutoId)
    if (!grupo) return null
    const corHex = grupo.getCorHex()
    const iconName = grupo.getIconName()
    if (!corHex || !iconName) return null
    return { corHex, iconName }
  }, [gruposProdutos, grupoProdutoId])

  const syncFromData = useCallback((next: NonNullable<typeof data>) => {
    const baseline = {
      nome: next.nome,
      descricao: next.descricao ?? '',
      valor: Number(next.valor),
      ativo: next.ativo,
      favorito: next.favorito,
      gruposComplementosIds: (next.gruposComplementos ?? []).map(g => g.id).filter(Boolean),
    }
    baselineRef.current = baseline
    setNome(baseline.nome)
    setDescricao(baseline.descricao)
    setValor(formatMenuProdutoCurrency(String(Math.round(baseline.valor * 100))))
    setAtivo(baseline.ativo)
    setFavorito(baseline.favorito)
    setGruposComplementosIds(baseline.gruposComplementosIds)
    const nomeCategoria = next.grupoProduto?.nome ?? 'Sem categoria'
    setCategoriaNome(nomeCategoria)
    categoriaNomeSalvoRef.current = nomeCategoria
    setEditandoCategoria(false)
  }, [])

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
      !sameIdList(gruposComplementosIds, base.gruposComplementosIds)
    )
  }, [nome, descricao, valor, ativo, favorito, gruposComplementosIds])

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
      gruposComplementosIds: [...gruposComplementosIds],
    }

    const patch: UpdateMenuProdutoInput = {
      nome: snapshot.nome,
      descricao: snapshot.descricao,
      valor: snapshot.valor,
      ativo: snapshot.ativo,
      favorito: snapshot.favorito,
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
    gruposComplementosIds,
    produtoId,
    menuId,
    pedirConfirmacao,
    aplicarNosDestinos,
    updateProduto,
    dirtyTargetMenuId,
  ])

  useImperativeHandle(ref, () => ({ isDirty, save }), [isDirty, save])

  useEffect(() => {
    if (!editandoCategoria) return
    const el = categoriaInputRef.current
    if (!el) return
    el.focus()
    el.select()
  }, [editandoCategoria])

  useLayoutEffect(() => {
    if (!editandoCategoria) return

    const sizer = categoriaSizerRef.current
    if (sizer) {
      const measured = Math.ceil(sizer.scrollWidth) + CATEGORIA_INPUT_FOLGA_PX
      setCategoriaInputWidthPx(Math.max(measured, CATEGORIA_INPUT_MIN_PX))
    }
  }, [categoriaNome, editandoCategoria])

  const iniciarEdicaoCategoria = () => {
    if (!grupoProdutoId || savingCategoria) return
    categoriaNomeSalvoRef.current = categoriaNome
    setEditandoCategoria(true)
  }

  const cancelarEdicaoCategoria = () => {
    setCategoriaNome(categoriaNomeSalvoRef.current)
    setEditandoCategoria(false)
  }

  const renomearGrupoEmMenu = async (
    token: string,
    alvoMenuId: string,
    nome: string
  ) => {
    const response = await fetchGestorApi(
      `/api/menus/${alvoMenuId}/grupos-produtos/${grupoProdutoId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nome }),
      }
    )
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        (errorData as { message?: string }).message ||
          'Erro ao renomear categoria em outro cardápio'
      )
    }
  }

  const renomearGrupoNoCadastroBase = async (token: string, nome: string) => {
    const response = await fetchGestorApi(`/api/grupos-produtos/${grupoProdutoId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ nome }),
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        (errorData as { message?: string }).message ||
          'Erro ao renomear categoria no cadastro base'
      )
    }
  }

  const salvarNomeCategoria = async () => {
    const nomeTrim = categoriaNome.trim()
    if (!nomeTrim) {
      showToast.error('Informe o nome da categoria neste cardápio')
      return
    }
    if (!grupoProdutoId) {
      showToast.error('Categoria não encontrada neste cardápio')
      setEditandoCategoria(false)
      return
    }
    if (nomeTrim === categoriaNomeSalvoRef.current.trim()) {
      setEditandoCategoria(false)
      return
    }

    bloqueiaBlurCategoriaRef.current = true
    setSavingCategoria(true)
    try {
      const destinos = await pedirConfirmacao({
        origem: 'menu',
        produtoId,
        menuIdAtual: menuId,
      })
      if (destinos === null) return

      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
      if (!token) throw new Error('Token não encontrado')

      await renameGrupo.mutateAsync({ grupoProdutoId, nome: nomeTrim })

      for (const outroMenuId of destinos.menuIds) {
        await renomearGrupoEmMenu(token, outroMenuId, nomeTrim)
      }
      if (destinos.aplicarNoCadastroBase) {
        await renomearGrupoNoCadastroBase(token, nomeTrim)
      }

      setCategoriaNome(nomeTrim)
      categoriaNomeSalvoRef.current = nomeTrim
      setEditandoCategoria(false)
      await invalidate(['menu-grupos'])
      await invalidate(['menu-produto', menuId, produtoId])
      await invalidate(['menu-produtos'])
      await invalidate(['grupos-produtos'])

      if (destinos.aplicarNoCadastroBase || destinos.menuIds.length > 0) {
        showToast.success('Categoria atualizada neste cardápio e nos selecionados')
      } else {
        showToast.success('Categoria atualizada neste cardápio')
      }
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : 'Erro ao salvar categoria')
    } finally {
      setSavingCategoria(false)
      bloqueiaBlurCategoriaRef.current = false
    }
  }

  const handleBlurCategoria = () => {
    if (bloqueiaBlurCategoriaRef.current || savingCategoria) return
    cancelarEdicaoCategoria()
  }

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
    <div className="relative overflow-x-hidden border-t border-gray-200/80 py-1">
      {saving ? (
        <div className="absolute right-2 top-1 z-10 text-[10px] text-secondary-text">Salvando…</div>
      ) : null}

      <div
        className="mb-1 flex items-center gap-2 bg-gray-50 px-2 py-1.5"
        onClick={e => e.stopPropagation()}
      >
        {grupoVisual ? (
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border-2 bg-white text-[var(--grupo-color)]"
            style={{
              borderColor: grupoVisual.corHex,
              ['--grupo-color' as string]: grupoVisual.corHex,
            }}
          >
            <DinamicIcon iconName={grupoVisual.iconName} color="currentColor" size={18} />
          </span>
        ) : (
          <span className="h-9 w-9 shrink-0 rounded-full border border-gray-300 bg-gray-200" />
        )}
        {editandoCategoria ? (
          <span className="relative inline-flex max-w-[min(100%,28rem)] shrink-0 items-center">
            <span
              ref={categoriaSizerRef}
              aria-hidden
              className={cn(
                'invisible absolute left-0 top-0 whitespace-pre',
                CATEGORIA_INPUT_TEXT_CLASS
              )}
            >
              {categoriaNome || ' '}
            </span>
            <input
              ref={categoriaInputRef}
              type="text"
              aria-label="Nome da categoria neste cardápio"
              value={categoriaNome}
              disabled={savingCategoria}
              onChange={handleCategoriaNomeChange}
              onBlur={handleBlurCategoria}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void salvarNomeCategoria()
                }
                if (e.key === 'Escape') {
                  e.preventDefault()
                  cancelarEdicaoCategoria()
                }
              }}
              style={{ width: categoriaInputWidthPx }}
              className={cn(
                'border-0 bg-transparent outline-none ring-1 ring-primary/40',
                CATEGORIA_INPUT_TEXT_CLASS
              )}
            />
          </span>
        ) : (
          <p className={cn('min-w-0 truncate', CATEGORIA_INPUT_TEXT_CLASS)}>
            {categoriaNome}
          </p>
        )}
        <button
          type="button"
          title="Editar nome da categoria neste cardápio"
          disabled={!grupoProdutoId || savingCategoria || editandoCategoria}
          onClick={iniciarEdicaoCategoria}
          className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-gray-200 text-primary-text transition-colors hover:bg-primary/10',
            (!grupoProdutoId || savingCategoria || editandoCategoria) &&
              'cursor-not-allowed opacity-50'
          )}
        >
          <MdModeEdit size={14} />
        </button>
      </div>

      <div
        className="grid w-full items-center gap-x-1.5 border border-gray-200 bg-white px-2 py-2 md:gap-x-2 md:px-3 [grid-template-columns:auto_minmax(0,30ch)_auto_minmax(0,1fr)_auto]"
        onClick={e => e.stopPropagation()}
      >
        {data.image?.imageUrl?.trim() ? (
          <Tooltip title="Imagem neste cardápio" arrow placement="top">
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-gray-200 md:h-12 md:w-12">
              {/* eslint-disable-next-line @next/next/no-img-element -- snapshot do menu (somente leitura) */}
              <img
                src={data.image.imageUrl.trim()}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          </Tooltip>
        ) : (
          <Tooltip title="Sem imagem neste cardápio" arrow placement="top">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-secondary-text md:h-12 md:w-12"
              aria-hidden
            >
              <MdImageNotSupported className="h-6 w-6" />
            </div>
          </Tooltip>
        )}

        <input
          type="text"
          aria-label="Nome no cardápio"
          ref={nomeCardapioInputRef}
          value={nome}
          disabled={saving}
          onChange={handleNomeChange}
          className="min-w-0 truncate border-0 bg-transparent text-sm font-normal tracking-wide text-primary-text outline-none ring-0 focus:ring-1 focus:ring-primary/40 md:text-base"
        />

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

        <div className="min-w-0" aria-hidden />

        <div className="flex shrink-0 items-center justify-end gap-2">
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
    </div>
  )
})
