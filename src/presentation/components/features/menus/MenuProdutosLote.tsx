'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Autocomplete, InputAdornment, TextField } from '@mui/material'
import { MdImageNotSupported, MdSearch, MdStar } from 'react-icons/md'
import { useMenu } from '@/src/presentation/hooks/menus/useMenus'
import {
  useMenuGruposProdutos,
  useMenuProdutos,
} from '@/src/presentation/hooks/menus/useMenuCatalog'
import { useMenuMutations } from '@/src/presentation/hooks/menus/useMenuMutations'
import { coletarGruposMenuPorSnapshot, ordemSnapshotCategoria } from './ordenarGruposMenuSnapshot'
import { useGruposComplementos } from '@/src/presentation/hooks/useGruposComplementos'
import { useListaVinculoLote } from '@/src/presentation/hooks/useListaVinculoLote'
import { usePropagarAlteracaoProduto } from '@/src/presentation/hooks/produtos/usePropagarAlteracaoProduto'
import { useGestaoPath } from '@/src/presentation/hooks/useGestaoPath'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { Button } from '@/src/presentation/components/ui/button'
import { Checkbox } from '@/src/presentation/components/ui/checkbox'
import { Input } from '@/src/presentation/components/ui/input'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { FixedRowsScrollArea } from '@/src/presentation/components/ui/FixedRowsScrollArea'
import { sxEntradaCompactaProduto } from '@/src/presentation/components/features/produtos/NovoProduto/produtoFormMuiSx'
import { brToEUA } from '@/src/shared/utils/formatters'
import { showToast } from '@/src/shared/utils/toast'
import { cn } from '@/src/shared/utils/cn'
import { uniaoIdsVinculosDosAlvos } from '@/src/shared/helpers/filtroVinculoLote'
import type { ModoVinculoLote } from '@/src/shared/helpers/filtroVinculoLote'
import { TEXTOS_VINCULO_GRUPOS_COMPLEMENTOS } from '@/src/shared/helpers/filtroVinculoLote'
import type { GrupoComplemento } from '@/src/domain/entities/GrupoComplemento'
import type {
  MenuGrupoProduto,
  MenuProduto,
  UpdateMenuProdutoInput,
} from '@/src/shared/types/menus'
import {
  atualizarMenuProdutoViaBffUseCase,
  atualizarMenuProdutosBatchViaBffUseCase,
} from '@/src/application/use-cases/menus/menuBffUseCases'
import type { SnapshotProdutoPropagavel } from '@/src/shared/types/propagarAlteracaoProduto'

const BATCH_CHUNK = 100
const MONEY = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

type TabLoteMenu = 'precos' | 'statusFavorito' | 'complementos' | 'categoria'

type UpdateItem = { produtoId: string } & UpdateMenuProdutoInput

function chunkArray<T>(items: T[], size: number): T[][] {
  if (items.length === 0) return []
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

function arredondarValor(valor: number): number {
  return Math.round(valor * 100) / 100
}

interface MenuProdutosLoteProps {
  menuId: string
}

export function MenuProdutosLote({ menuId }: MenuProdutosLoteProps) {
  const { toGestao } = useGestaoPath()
  const { data: menu } = useMenu(menuId)
  const { syncProdutos } = useMenuMutations(menuId)
  const { pedirConfirmacao, aplicarNosDestinos, dialog: dialogPropagacao } =
    usePropagarAlteracaoProduto()

  const [activeTab, setActiveTab] = useState<TabLoteMenu>('precos')
  const [searchText, setSearchText] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'ativo' | 'inativo'>('ativo')
  const [grupoProdutoId, setGrupoProdutoId] = useState('')
  const [selecionados, setSelecionados] = useState<Set<string>>(() => new Set())
  const [alteradosPorAba, setAlteradosPorAba] = useState<Record<TabLoteMenu, Set<string>>>({
    precos: new Set(),
    statusFavorito: new Set(),
    complementos: new Set(),
    categoria: new Set(),
  })
  const [isUpdating, setIsUpdating] = useState(false)

  const [adjustMode, setAdjustMode] = useState<'valor' | 'percentual'>('valor')
  const [adjustDirection, setAdjustDirection] = useState<'increase' | 'decrease'>('increase')
  const [adjustAmount, setAdjustAmount] = useState('')

  const [statusAtivoAcao, setStatusAtivoAcao] = useState<'ativar' | 'desativar'>('ativar')
  const [favoritoAcao, setFavoritoAcao] = useState<'marcar' | 'desmarcar'>('marcar')
  const [aplicarAtivo, setAplicarAtivo] = useState(true)
  const [aplicarFavorito, setAplicarFavorito] = useState(false)

  const [modoComplemento, setModoComplemento] = useState<ModoVinculoLote>('adicionar')
  const [gruposComplSelecionados, setGruposComplSelecionados] = useState<Set<string>>(
    () => new Set()
  )

  const [categoriaAlvo, setCategoriaAlvo] = useState<MenuGrupoProduto | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(searchText), 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchText])

  const ativoFilter =
    filterStatus === 'all' ? null : filterStatus === 'ativo' ? true : false

  const {
    data: produtosData,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useMenuProdutos({
    menuId,
    q: debouncedSearch,
    grupoProdutoId: grupoProdutoId || undefined,
    ativo: ativoFilter,
    tipo: 'all',
  })

  const {
    data: gruposData,
    fetchNextPage: fetchNextGrupos,
    hasNextPage: hasNextGrupos,
    isFetchingNextPage: isFetchingNextGrupos,
  } = useMenuGruposProdutos({ menuId })

  useEffect(() => {
    if (hasNextGrupos && !isFetchingNextGrupos) void fetchNextGrupos()
  }, [hasNextGrupos, isFetchingNextGrupos, fetchNextGrupos])

  const gruposDoMenu = useMemo(
    () => coletarGruposMenuPorSnapshot(gruposData?.pages),
    [gruposData]
  )

  const { data: gruposComplementos = [] } = useGruposComplementos({
    limit: 100,
    ativo: true,
  })

  const produtos = useMemo(() => {
    const map = new Map<string, MenuProduto>()
    for (const page of produtosData?.pages ?? []) {
      for (const p of page.items) {
        if (!map.has(p.produtoId)) map.set(p.produtoId, p)
      }
    }
    const ordemGrupo = new Map(
      gruposDoMenu.map(g => [g.grupoBase.id, ordemSnapshotCategoria(g)])
    )
    return Array.from(map.values()).sort((a, b) => {
      const grupoA = ordemGrupo.get(a.grupoProduto?.id ?? '') ?? Number.MAX_SAFE_INTEGER
      const grupoB = ordemGrupo.get(b.grupoProduto?.id ?? '') ?? Number.MAX_SAFE_INTEGER
      if (grupoA !== grupoB) return grupoA - grupoB
      if (a.ordem !== b.ordem) return a.ordem - b.ordem
      return a.nome.localeCompare(b.nome, 'pt-BR')
    })
  }, [produtosData, gruposDoMenu])

  const totalApi = produtosData?.pages?.[0]?.count ?? 0

  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, produtos.length])

  const todosSelecionados =
    produtos.length > 0 && produtos.every(p => selecionados.has(p.produtoId))
  const algunsSelecionados =
    produtos.some(p => selecionados.has(p.produtoId)) && !todosSelecionados

  const toggleSelecao = (id: string) => {
    setSelecionados(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const produtosSelecionadosDados = useMemo(
    () => produtos.filter(p => selecionados.has(p.produtoId)),
    [produtos, selecionados]
  )

  const idsComplJaVinculados = useMemo(
    () =>
      uniaoIdsVinculosDosAlvos(
        produtos,
        selecionados,
        p => p.produtoId,
        p => (p.gruposComplementos ?? []).map(g => g.id)
      ),
    [produtos, selecionados]
  )

  const listaCompl = useListaVinculoLote({
    catalogo: gruposComplementos,
    getId: (g: GrupoComplemento) => g.getId(),
    getNome: (g: GrupoComplemento) => g.getNome(),
    idsJaVinculados: idsComplJaVinculados,
    modo: modoComplemento,
    temAlvosSelecionados: selecionados.size > 0,
    selecionados: gruposComplSelecionados,
    setSelecionados: setGruposComplSelecionados,
    textos: TEXTOS_VINCULO_GRUPOS_COMPLEMENTOS,
  })

  const marcarAlterados = useCallback((ids: string[], aba: TabLoteMenu) => {
    setAlteradosPorAba(prev => {
      const next = new Set(prev[aba])
      for (const id of ids) next.add(id)
      return { ...prev, [aba]: next }
    })
  }, [])

  const persistirUpdate = useCallback(
    async (update: UpdateItem[]) => {
      if (update.length === 0) return
      for (const chunk of chunkArray(update, BATCH_CHUNK)) {
        await syncProdutos.mutateAsync({ update: chunk })
      }
    },
    [syncProdutos]
  )

  const propagarAposSalvar = useCallback(
    async (update: UpdateItem[]) => {
      if (update.length === 0) return
      const primeiroId = update[0]?.produtoId
      if (!primeiroId) return

      const destinos = await pedirConfirmacao({
        origem: 'menu',
        produtoId: primeiroId,
        menuIdAtual: menuId,
        fonteMenus: 'empresa',
      })
      if (!destinos) return
      if (!destinos.aplicarNoCadastroBase && destinos.menuIds.length === 0) return

      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
      if (!token) throw new Error('Token não encontrado')

      for (const alvoMenuId of destinos.menuIds) {
        try {
          await atualizarMenuProdutosBatchViaBffUseCase.execute({
            token,
            menuId: alvoMenuId,
            data: { update },
          })
        } catch {
          for (const item of update) {
            const { produtoId, ...input } = item
            await atualizarMenuProdutoViaBffUseCase.execute({
              token,
              menuId: alvoMenuId,
              produtoId,
              data: input,
            })
          }
        }
      }

      if (destinos.aplicarNoCadastroBase) {
        for (const item of update) {
          const { produtoId, ...rest } = item
          const snapshot: SnapshotProdutoPropagavel = { ...rest }
          await aplicarNosDestinos({
            produtoId,
            snapshot,
            destinos: { aplicarNoCadastroBase: true, menuIds: [] },
          })
        }
      }
    },
    [pedirConfirmacao, aplicarNosDestinos, menuId]
  )

  const aplicarEPropagar = useCallback(
    async (update: UpdateItem[], aba: TabLoteMenu, sucessoMsg: string) => {
      setIsUpdating(true)
      try {
        await persistirUpdate(update)
        marcarAlterados(
          update.map(u => u.produtoId),
          aba
        )
        showToast.success(sucessoMsg)
        await propagarAposSalvar(update)
      } catch (err) {
        showToast.error(err instanceof Error ? err.message : 'Erro ao aplicar alterações')
      } finally {
        setIsUpdating(false)
      }
    },
    [persistirUpdate, marcarAlterados, propagarAposSalvar]
  )

  const handleAplicarPrecos = async () => {
    if (selecionados.size === 0) {
      showToast.error('Selecione pelo menos um produto')
      return
    }
    const parsed = brToEUA(adjustAmount)
    if (!Number.isFinite(parsed) || parsed === 0) {
      showToast.error('Informe um valor de ajuste válido')
      return
    }
    if (parsed < 0) {
      showToast.error('Informe apenas valores positivos')
      return
    }
    if (adjustDirection === 'decrease') {
      if (adjustMode === 'valor') {
        const menor = Math.min(...produtosSelecionadosDados.map(p => Number(p.valor)))
        if (parsed >= menor) {
          showToast.error(
            'O valor para diminuir não pode ser maior ou igual ao menor preço selecionado'
          )
          return
        }
      } else if (parsed >= 100) {
        showToast.error('A porcentagem para diminuir deve ser menor que 100%')
        return
      }
    }

    const sign = adjustDirection === 'increase' ? 1 : -1
    const update: UpdateItem[] = produtosSelecionadosDados.map(p => {
      const atual = Number(p.valor)
      const novo =
        adjustMode === 'valor'
          ? arredondarValor(atual + sign * parsed)
          : arredondarValor(atual * (1 + (sign * parsed) / 100))
      return { produtoId: p.produtoId, valor: Math.max(0.01, novo) }
    })

    await aplicarEPropagar(
      update,
      'precos',
      `Preços atualizados em ${update.length} produto(s) neste cardápio`
    )
  }

  const handleAplicarStatusFavorito = async () => {
    if (selecionados.size === 0) {
      showToast.error('Selecione pelo menos um produto')
      return
    }
    if (!aplicarAtivo && !aplicarFavorito) {
      showToast.error('Marque Status e/ou Favorito para aplicar')
      return
    }
    const update: UpdateItem[] = produtosSelecionadosDados.map(p => {
      const item: UpdateItem = { produtoId: p.produtoId }
      if (aplicarAtivo) item.ativo = statusAtivoAcao === 'ativar'
      if (aplicarFavorito) item.favorito = favoritoAcao === 'marcar'
      return item
    })
    await aplicarEPropagar(
      update,
      'statusFavorito',
      `Status/favorito atualizados em ${update.length} produto(s)`
    )
  }

  const handleAplicarComplementos = async () => {
    if (selecionados.size === 0) {
      showToast.error('Selecione pelo menos um produto')
      return
    }
    if (gruposComplSelecionados.size === 0) {
      showToast.error('Selecione pelo menos um grupo de complementos')
      return
    }
    const idsCompl = Array.from(gruposComplSelecionados)
    const update: UpdateItem[] = produtosSelecionadosDados.map(p => {
      const atuais = (p.gruposComplementos ?? []).map(g => g.id)
      let next: string[]
      if (modoComplemento === 'adicionar') {
        next = [...new Set([...atuais, ...idsCompl])]
      } else {
        const rem = new Set(idsCompl)
        next = atuais.filter(id => !rem.has(id))
      }
      return { produtoId: p.produtoId, gruposComplementosIds: next }
    })
    await aplicarEPropagar(
      update,
      'complementos',
      modoComplemento === 'adicionar'
        ? `Complementos vinculados em ${update.length} produto(s)`
        : `Complementos removidos em ${update.length} produto(s)`
    )
  }

  const handleAplicarCategoria = async () => {
    if (selecionados.size === 0) {
      showToast.error('Selecione pelo menos um produto')
      return
    }
    if (!categoriaAlvo?.grupoBase?.id) {
      showToast.error('Selecione a categoria de destino')
      return
    }
    const gid = categoriaAlvo.grupoBase.id
    const update: UpdateItem[] = produtosSelecionadosDados.map(p => ({
      produtoId: p.produtoId,
      grupoProdutoId: gid,
    }))
    await aplicarEPropagar(
      update,
      'categoria',
      `Categoria atualizada em ${update.length} produto(s)`
    )
  }

  const limparFiltros = () => {
    setSearchText('')
    setDebouncedSearch('')
    setFilterStatus('ativo')
    setGrupoProdutoId('')
  }

  const tituloAba =
    activeTab === 'precos'
      ? 'Ajuste de preços neste cardápio'
      : activeTab === 'statusFavorito'
        ? 'Status e favorito neste cardápio'
        : activeTab === 'complementos'
          ? 'Complementos neste cardápio'
          : 'Categoria neste cardápio'

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-primary/30 bg-white px-2 py-3 md:px-4">
        <div>
          <h1 className="text-lg font-semibold text-primary-text md:text-xl">{tituloAba}</h1>
          <p className="text-sm text-secondary-text">
            {menu?.nome ? `Menu: ${menu.nome}` : 'Carregando menu…'} · Total {produtos.length} de{' '}
            {totalApi} · Selecionados {selecionados.size}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ['precos', 'Preços'],
              ['statusFavorito', 'Status / Favorito'],
              ['complementos', 'Complementos'],
              ['categoria', 'Categoria'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={cn(
                'rounded px-2 py-1 text-sm font-semibold transition-colors md:px-4',
                activeTab === key
                  ? 'bg-primary text-info'
                  : 'text-secondary-text hover:bg-primary/10'
              )}
            >
              {label}
            </button>
          ))}
          <Link
            href={toGestao(`/menus/${menuId}`)}
            className="flex h-8 items-center rounded-lg border border-primary bg-info px-6 text-sm font-semibold text-primary shadow-sm transition-colors hover:bg-primary/20"
          >
            Fechar
          </Link>
        </div>
      </div>

      <div className="border-b border-primary/70 bg-primary-bg px-2 py-2 md:px-6">
        {activeTab === 'precos' ? (
          <div className="flex flex-wrap items-end gap-2 md:gap-4">
            <div className="w-full sm:w-[150px]">
              <label className="mb-1 block text-xs font-semibold text-secondary-text">
                Tipo de ajuste
              </label>
              <select
                value={adjustMode}
                onChange={e => setAdjustMode(e.target.value as 'valor' | 'percentual')}
                className="h-8 w-full rounded-lg border border-primary/70 bg-white px-3 text-sm"
              >
                <option value="valor">Valor (R$)</option>
                <option value="percentual">Porcent. (%)</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-sm font-semibold">
                <Checkbox
                  checked={adjustDirection === 'increase'}
                  onChange={() => setAdjustDirection('increase')}
                />
                (+)
              </label>
              <label className="flex items-center gap-1 text-sm font-semibold">
                <Checkbox
                  checked={adjustDirection === 'decrease'}
                  onChange={() => setAdjustDirection('decrease')}
                />
                (-)
              </label>
            </div>
            <div className="w-full max-w-[200px]">
              <label className="mb-1 block text-xs font-semibold text-secondary-text">
                {adjustDirection === 'increase' ? 'Aumentar' : 'Diminuir'} (
                {adjustMode === 'valor' ? 'R$' : '%'})
              </label>
              <Input
                value={adjustAmount}
                onChange={e => setAdjustAmount(e.target.value.replace(/[^\d,.-]/g, ''))}
                placeholder={adjustMode === 'valor' ? '0,00' : '0'}
                size="small"
                InputProps={{
                  sx: {
                    height: 32,
                    backgroundColor: '#fff',
                    borderRadius: '0.5rem',
                    '& input': {
                      padding: '6px 10px',
                      fontSize: '0.875rem',
                      height: 32,
                      boxSizing: 'border-box',
                    },
                    '& fieldset': {
                      borderColor: 'var(--color-primary)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: 'var(--color-primary)',
                      borderWidth: '1px',
                    },
                  },
                }}
              />
            </div>
            <Button
              type="button"
              disabled={isUpdating || selecionados.size === 0}
              onClick={() => void handleAplicarPrecos()}
              className="h-8 bg-primary text-info"
            >
              {isUpdating ? 'Aplicando…' : `Aplicar ajuste (${selecionados.size})`}
            </Button>
          </div>
        ) : null}

        {activeTab === 'statusFavorito' ? (
          <div className="flex flex-wrap items-end gap-4">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <Checkbox checked={aplicarAtivo} onChange={() => setAplicarAtivo(v => !v)} />
              Status
            </label>
            <select
              value={statusAtivoAcao}
              disabled={!aplicarAtivo}
              onChange={e => setStatusAtivoAcao(e.target.value as 'ativar' | 'desativar')}
              className="h-8 rounded-lg border border-primary/70 bg-white px-3 text-sm disabled:opacity-50"
            >
              <option value="ativar">Ativar</option>
              <option value="desativar">Desativar</option>
            </select>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <Checkbox checked={aplicarFavorito} onChange={() => setAplicarFavorito(v => !v)} />
              Favorito
            </label>
            <select
              value={favoritoAcao}
              disabled={!aplicarFavorito}
              onChange={e => setFavoritoAcao(e.target.value as 'marcar' | 'desmarcar')}
              className="h-8 rounded-lg border border-primary/70 bg-white px-3 text-sm disabled:opacity-50"
            >
              <option value="marcar">Marcar</option>
              <option value="desmarcar">Desmarcar</option>
            </select>
            <Button
              type="button"
              disabled={isUpdating || selecionados.size === 0}
              onClick={() => void handleAplicarStatusFavorito()}
              className="h-8 bg-primary text-info"
            >
              {isUpdating ? 'Aplicando…' : `Aplicar (${selecionados.size})`}
            </Button>
          </div>
        ) : null}

        {activeTab === 'complementos' ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-secondary-text">Modo de operação:</span>
              <div className="flex gap-1 rounded-lg bg-info p-1">
                <button
                  type="button"
                  onClick={() => {
                    setModoComplemento('adicionar')
                    setGruposComplSelecionados(new Set())
                    listaCompl.limparBusca()
                  }}
                  className={`rounded px-3 py-1 text-xs font-semibold transition-colors ${
                    modoComplemento === 'adicionar'
                      ? 'bg-primary text-info'
                      : 'text-secondary-text hover:bg-primary/10'
                  }`}
                >
                  Vincular
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModoComplemento('remover')
                    setGruposComplSelecionados(new Set())
                    listaCompl.limparBusca()
                  }}
                  className={`rounded px-3 py-1 text-xs font-semibold transition-colors ${
                    modoComplemento === 'remover'
                      ? 'bg-primary text-info'
                      : 'text-secondary-text hover:bg-primary/10'
                  }`}
                >
                  Desvincular
                </button>
              </div>
              <span className="text-[11px] text-secondary-text">{listaCompl.hintModo}</span>
            </div>

            <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <label className="block whitespace-nowrap text-xs font-semibold text-secondary-text">
                  {modoComplemento === 'adicionar'
                    ? 'Selecionar Grupos de Complementos'
                    : 'Selecionar Grupos de Complementos para Remover'}{' '}
                  ({gruposComplSelecionados.size} selecionado
                  {gruposComplSelecionados.size !== 1 ? 's' : ''}
                  {listaCompl.paraExibir.length > 0
                    ? ` · ${listaCompl.filtradas.length}/${listaCompl.paraExibir.length}`
                    : ''}
                  )
                </label>
                {listaCompl.exibirBusca ? (
                  <div className="w-[min(200px,100%)]">
                    <Input
                      size="small"
                      value={listaCompl.busca}
                      onChange={e => listaCompl.setBusca(e.target.value)}
                      placeholder="Pesquisar grupo..."
                      aria-label="Pesquisar grupo de complementos"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <MdSearch size={16} className="text-secondary-text" aria-hidden />
                          </InputAdornment>
                        ),
                        sx: {
                          height: 32,
                          backgroundColor: '#fff',
                          borderRadius: '0.5rem',
                          '& input': {
                            padding: '6px 10px',
                            fontSize: '0.75rem',
                            height: 32,
                            boxSizing: 'border-box',
                          },
                          '& fieldset': {
                            borderColor: 'rgba(0,0,0,0.23)',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: 'var(--color-primary)',
                            borderWidth: '1px',
                          },
                        },
                      }}
                    />
                  </div>
                ) : null}
              </div>
              <div className="flex items-center gap-4">
                {listaCompl.filtradas.length > 0 ? (
                  <button
                    type="button"
                    onClick={listaCompl.toggleSelecaoTodasVisiveis}
                    className="whitespace-nowrap text-xs text-primary hover:underline"
                  >
                    {listaCompl.todasSelecionadas ? 'Desmarcar todos' : 'Selecionar todos'}
                  </button>
                ) : null}
                <Button
                  type="button"
                  disabled={
                    isUpdating || selecionados.size === 0 || gruposComplSelecionados.size === 0
                  }
                  onClick={() => void handleAplicarComplementos()}
                  className="h-8 bg-primary text-info md:min-w-[180px]"
                >
                  {isUpdating
                    ? modoComplemento === 'adicionar'
                      ? 'Vinculando…'
                      : 'Desvinculando…'
                    : modoComplemento === 'adicionar'
                      ? `Vincular a ${selecionados.size} produto(s)`
                      : `Desvincular de ${selecionados.size} produto(s)`}
                </Button>
              </div>
            </div>

            {listaCompl.paraExibir.length === 0 ? (
              <div className="flex items-center justify-center py-4">
                <span className="text-sm text-secondary-text">{listaCompl.emptyModo}</span>
              </div>
            ) : listaCompl.filtradas.length === 0 ? (
              <div className="flex items-center justify-center py-4">
                <span className="text-sm text-secondary-text">
                  Nenhum grupo encontrado para “{listaCompl.busca.trim()}”
                </span>
              </div>
            ) : (
              <div className="max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white p-1.5">
                <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
                  {listaCompl.filtradas.map(g => {
                    const id = g.getId()
                    const isSelected = gruposComplSelecionados.has(id)
                    return (
                      <label
                        key={id}
                        className={`flex min-h-0 cursor-pointer items-center gap-1 rounded-lg border px-1.5 py-1 transition-colors ${
                          isSelected
                            ? 'border-primary bg-primary/10'
                            : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <Checkbox
                          size="small"
                          checked={isSelected}
                          onChange={() => {
                            setGruposComplSelecionados(prev => {
                              const next = new Set(prev)
                              if (next.has(id)) next.delete(id)
                              else next.add(id)
                              return next
                            })
                          }}
                          className="shrink-0"
                        />
                        <span
                          className="truncate text-xs font-medium text-primary-text md:text-sm"
                          title={g.getNome()}
                        >
                          {g.getNome()}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {activeTab === 'categoria' ? (
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-full max-w-sm">
              <Autocomplete<MenuGrupoProduto, false, false, false>
                size="small"
                options={gruposDoMenu}
                value={categoriaAlvo}
                onChange={(_, value) => setCategoriaAlvo(value)}
                getOptionLabel={g => g.nome || g.grupoBase.nome}
                getOptionKey={g => g.grupoBase.id}
                isOptionEqualToValue={(a, b) => a.grupoBase.id === b.grupoBase.id}
                renderInput={params => (
                  <TextField
                    {...params}
                    label="Categoria neste cardápio"
                    size="small"
                    sx={sxEntradaCompactaProduto}
                  />
                )}
              />
            </div>
            <Button
              type="button"
              disabled={isUpdating || selecionados.size === 0 || !categoriaAlvo}
              onClick={() => void handleAplicarCategoria()}
              className="h-8 bg-primary text-info"
            >
              {isUpdating ? 'Aplicando…' : `Aplicar categoria (${selecionados.size})`}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-end gap-2 border-b border-gray-200 bg-white px-2 py-2 md:px-4">
        <div className="relative min-w-[200px] flex-1">
          <input
            type="text"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder="Pesquisar produto…"
            className="h-9 w-full rounded-lg border border-gray-200 bg-white py-1 pl-10 pr-3 text-sm"
          />
          <MdSearch
            className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text"
            size={18}
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
          className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm"
        >
          <option value="all">Todos</option>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
        </select>
        <select
          value={grupoProdutoId}
          onChange={e => setGrupoProdutoId(e.target.value)}
          className="h-9 max-w-[220px] rounded-lg border border-gray-200 bg-white px-3 text-sm"
        >
          <option value="">Todas as categorias</option>
          {gruposDoMenu.map(g => (
            <option key={g.grupoBase.id} value={g.grupoBase.id}>
              {g.nome || g.grupoBase.nome}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={limparFiltros}
          className="h-9 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-primary-text hover:bg-gray-50"
        >
          Limpar filtros
        </button>
      </div>

      <div className="min-h-0 flex-1 px-1 pb-8 pt-2 md:px-2">
        {isLoading && produtos.length === 0 ? (
          <div className="flex justify-center py-12">
            <JiffyLoading />
          </div>
        ) : produtos.length === 0 ? (
          <p className="py-12 text-center text-secondary-text">Nenhum produto neste cardápio</p>
        ) : (
          <FixedRowsScrollArea
            visibleRows={12}
            rowHeightPx={44}
            header={
              <div className="flex h-11 items-center gap-3 bg-custom-2 px-2 text-xs font-semibold uppercase tracking-wide text-primary-text md:px-4">
                <div className="flex w-6 flex-none justify-center md:w-10">
                  <Checkbox
                    checked={todosSelecionados}
                    indeterminate={algunsSelecionados}
                    onChange={e => {
                      if (e.target.checked) {
                        setSelecionados(new Set(produtos.map(p => p.produtoId)))
                      } else {
                        setSelecionados(new Set())
                      }
                    }}
                  />
                </div>
                <div className="w-10 shrink-0" />
                <div className="min-w-0 flex-1">Nome</div>
                <div className="hidden min-w-0 flex-1 md:block">Categoria</div>
                {activeTab === 'complementos' ? (
                  <div className="hidden min-w-0 flex-1 md:block">Complementos</div>
                ) : null}
                <div className="w-24 shrink-0 text-right md:w-28">Valor</div>
                <div className="w-16 shrink-0 text-center">Status</div>
              </div>
            }
          >
            <div className="flex flex-col gap-2">
              {produtos.map((produto, index) => {
                const isSelected = selecionados.has(produto.produtoId)
                const foiAlterado = alteradosPorAba[activeTab].has(produto.produtoId)
                const bgColor = isSelected
                  ? foiAlterado
                    ? 'bg-primary/25'
                    : 'bg-primary/20'
                  : foiAlterado
                    ? 'bg-primary-bg'
                    : index % 2 === 0
                      ? 'bg-gray-50'
                      : 'bg-white'
                const imagemUrl = produto.image?.imageUrl?.trim() || null
                return (
                  <div
                    key={produto.produtoId}
                    className={cn(
                      'flex min-h-9 items-center gap-3 rounded-lg px-2 transition-colors md:px-4',
                      bgColor
                    )}
                  >
                    <div className="flex w-6 flex-none justify-center md:w-10">
                      <Checkbox
                        checked={isSelected}
                        onChange={() => toggleSelecao(produto.produtoId)}
                      />
                    </div>
                    {imagemUrl ? (
                      <span className="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-gray-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imagemUrl} alt="" className="h-full w-full object-cover" />
                      </span>
                    ) : (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-secondary-text">
                        <MdImageNotSupported size={18} />
                      </span>
                    )}
                    <div className="flex min-w-0 flex-1 items-center gap-1">
                      <span className="truncate text-sm text-primary-text">{produto.nome}</span>
                      {produto.favorito ? (
                        <MdStar className="shrink-0 text-secondary" size={16} />
                      ) : null}
                    </div>
                    <div className="hidden min-w-0 flex-1 truncate text-sm text-secondary-text md:block">
                      {produto.grupoProduto?.nome || '—'}
                    </div>
                    {activeTab === 'complementos' ? (
                      <div className="hidden min-w-0 flex-1 truncate text-xs text-secondary-text md:block">
                        {(produto.gruposComplementos ?? []).map(g => g.nome).join(', ') || '—'}
                      </div>
                    ) : null}
                    <div className="w-24 shrink-0 text-right text-sm md:w-28">
                      {MONEY.format(Number(produto.valor))}
                    </div>
                    <div className="w-16 shrink-0 text-center text-xs font-semibold">
                      {produto.ativo ? (
                        <span className="text-success">Ativo</span>
                      ) : (
                        <span className="text-error">Inativo</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            {isFetchingNextPage ? (
              <div className="flex justify-center py-4">
                <JiffyLoading />
              </div>
            ) : null}
          </FixedRowsScrollArea>
        )}
      </div>

      {dialogPropagacao}
    </div>
  )
}
