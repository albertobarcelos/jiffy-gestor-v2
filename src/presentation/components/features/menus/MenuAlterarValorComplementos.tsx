'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { MdPause, MdPlayArrow, MdSearch } from 'react-icons/md'
import type { ComplementoUsoNoMenu } from '@/src/domain/complemento/tipos'
import {
  compararNomePt,
  listarComplementosDoCardapioLote,
} from '@/src/application/complementos/menuComplementoLote'
import {
  filtrarLinhasParaAtivoAlvo,
  LIMITE_VINCULOS_OVERRIDE,
  MODOS_VALOR_COMPLEMENTO_LOTE,
  partirEmLotes,
  valorComplementoNoModo,
  type ModoValorComplementoLote,
} from '@/src/application/complementos/valorComplementoLote'
import { useMenu } from '@/src/presentation/hooks/menus/useMenus'
import { MenuCardapioChrome } from './MenuCardapioChrome'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { Checkbox } from '@/src/presentation/components/ui/checkbox'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { handleApiError, showToast } from '@/src/shared/utils/toast'
import { cn } from '@/src/shared/utils/cn'
import { BotaoAtivoComplemento } from '@/src/presentation/components/features/complementos/BotaoAtivoComplemento'
import {
  buscarComplementoCompleto,
  gravarOverridesComplemento,
  listarGruposComplementoMenuLote,
} from '@/src/presentation/components/features/complementos/complementoOverrideApi'

type LinhaProduto = {
  chave: string
  produtoId: string
  produtoNome: string
  produtoAtivo: boolean
  grupoId: string
  grupoNome: string
  valorAtual: number
  complementoAtivo: boolean
}

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0)
}

function formatarDigitacao(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  return formatarMoeda(parseInt(digits, 10) / 100)
}

function lerMoeda(value: string): number {
  const normalized = value.replace(/R\$/g, '').trim().replace(/\./g, '').replace(',', '.')
  const parsed = parseFloat(normalized)
  if (Number.isNaN(parsed)) return 0
  return Math.round(parsed * 100) / 100
}

function contemBusca(texto: string, busca: string): boolean {
  const termo = busca.trim().toLocaleLowerCase('pt-BR')
  if (!termo) return true
  return texto.toLocaleLowerCase('pt-BR').includes(termo)
}

function montarLinhas(
  vinculos: ComplementoUsoNoMenu[],
  menuId: string,
  gruposIds: Set<string>
): LinhaProduto[] {
  const porChave = new Map<string, LinhaProduto>()
  for (const uso of vinculos) {
    if (uso.menu.id !== menuId || !gruposIds.has(uso.grupoComplementos.id)) continue
    const chave = `${uso.produto.id}:${uso.grupoComplementos.id}`
    porChave.set(chave, {
      chave,
      produtoId: uso.produto.id,
      produtoNome: uso.produto.nome,
      produtoAtivo: uso.produto.ativo,
      grupoId: uso.grupoComplementos.id,
      grupoNome: uso.grupoComplementos.nome,
      valorAtual: uso.complementoConfig.valor,
      complementoAtivo: uso.complementoConfig.ativo,
    })
  }
  return [...porChave.values()].sort((a, b) => {
    const porProduto = compararNomePt(a.produtoNome, b.produtoNome)
    if (porProduto !== 0) return porProduto
    return compararNomePt(a.grupoNome, b.grupoNome)
  })
}

function IconeCheckboxMarcado() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden className="block">
      <rect width="20" height="20" rx="3" className="fill-alternate" />
      <path
        d="M5 10.2 8.2 13.4 15 6.6"
        fill="none"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconeCheckboxParcial() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden className="block">
      <rect width="20" height="20" rx="3" className="fill-alternate" />
      <path d="M5 10h10" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

const iconesCheckboxLote = {
  checkedIcon: <IconeCheckboxMarcado />,
  indeterminateIcon: <IconeCheckboxParcial />,
}

interface MenuAlterarValorComplementosProps {
  menuId: string
}

export function MenuAlterarValorComplementos({ menuId }: MenuAlterarValorComplementosProps) {
  const invalidate = useInvalidateTenantQueries()
  const { data: menu } = useMenu(menuId)
  const [complementoId, setComplementoId] = useState<string | null>(null)
  const [gruposSelecionados, setGruposSelecionados] = useState<Set<string>>(() => new Set())
  const [modoValor, setModoValor] = useState<ModoValorComplementoLote>('alterar')
  const [novoValor, setNovoValor] = useState('')
  const [selecionados, setSelecionados] = useState<Set<string>>(() => new Set())
  const [salvando, setSalvando] = useState(false)
  const [pausandoChave, setPausandoChave] = useState<string | null>(null)
  const [ativoOverride, setAtivoOverride] = useState<Record<string, boolean>>({})
  const [buscaComplemento, setBuscaComplemento] = useState('')
  const [buscaGrupo, setBuscaGrupo] = useState('')
  const [buscaProduto, setBuscaProduto] = useState('')

  const gruposQuery = useSecureTenantQuery(
    ['menu-grupos-valor-complemento', menuId],
    () => listarGruposComplementoMenuLote(menuId),
    { staleTime: 0, refetchOnMount: 'always' }
  )

  const grupos = gruposQuery.data ?? []
  const complementos = useMemo(() => listarComplementosDoCardapioLote(grupos), [grupos])
  const complemento = useMemo(
    () => complementos.find(item => item.id === complementoId) ?? null,
    [complementos, complementoId]
  )
  const gruposDoComplemento = useMemo(
    () => grupos.filter(grupo => grupo.complementos.some(item => item.id === complementoId)),
    [grupos, complementoId]
  )
  const complementosFiltrados = useMemo(
    () => complementos.filter(item => contemBusca(item.nome, buscaComplemento)),
    [complementos, buscaComplemento]
  )
  const gruposFiltrados = useMemo(
    () => gruposDoComplemento.filter(item => contemBusca(item.nome, buscaGrupo)),
    [gruposDoComplemento, buscaGrupo]
  )

  const usosQuery = useSecureTenantQuery(
    ['menu-complemento-usos', menuId, complementoId ?? ''],
    async () => {
      if (!complementoId) return []
      const completo = await buscarComplementoCompleto(complementoId)
      return completo.vinculos
    },
    { enabled: Boolean(complementoId), staleTime: 0, refetchOnMount: 'always' }
  )

  const linhas = useMemo(
    () => montarLinhas(usosQuery.data ?? [], menuId, gruposSelecionados),
    [usosQuery.data, menuId, gruposSelecionados]
  )
  const linhasFiltradas = useMemo(
    () => linhas.filter(item => contemBusca(`${item.produtoNome} ${item.grupoNome}`, buscaProduto)),
    [linhas, buscaProduto]
  )
  const todosGruposMarcados =
    gruposFiltrados.length > 0 && gruposFiltrados.every(item => gruposSelecionados.has(item.id))
  const algumGrupoMarcado = gruposFiltrados.some(item => gruposSelecionados.has(item.id))
  const todosMarcados =
    linhasFiltradas.length > 0 && linhasFiltradas.every(item => selecionados.has(item.chave))
  const algumMarcado = linhasFiltradas.some(item => selecionados.has(item.chave))
  const podeAplicar = selecionados.size > 0 && novoValor.trim() !== '' && !salvando
  const podeAtivoLote = selecionados.size > 0 && !salvando && !pausandoChave

  const escolherComplemento = (id: string) => {
    setComplementoId(id)
    setGruposSelecionados(new Set())
    setModoValor('alterar')
    setNovoValor('')
    setSelecionados(new Set())
    setAtivoOverride({})
    setBuscaGrupo('')
    setBuscaProduto('')
  }

  const alternarGrupos = (ids: string[]) => {
    setGruposSelecionados(prev => {
      const next = new Set(prev)
      const todos = ids.length > 0 && ids.every(id => next.has(id))
      if (todos) {
        for (const id of ids) next.delete(id)
      } else {
        for (const id of ids) next.add(id)
      }
      setSelecionados(atual => {
        const filtrado = new Set<string>()
        for (const chave of atual) {
          const grupoDaLinha = chave.slice(chave.indexOf(':') + 1)
          if (next.has(grupoDaLinha)) filtrado.add(chave)
        }
        return filtrado
      })
      return next
    })
  }

  const alternarProdutos = (ids: string[]) => {
    setSelecionados(prev => {
      const next = new Set(prev)
      const todos = ids.length > 0 && ids.every(id => next.has(id))
      if (todos) {
        for (const id of ids) next.delete(id)
      } else {
        for (const id of ids) next.add(id)
      }
      return next
    })
  }

  const complementoAtivoDaLinha = (item: LinhaProduto) =>
    item.chave in ativoOverride ? ativoOverride[item.chave] : item.complementoAtivo

  const alternarAtivoLinha = async (item: LinhaProduto) => {
    if (!complementoId || pausandoChave) return
    const proximo = !complementoAtivoDaLinha(item)
    setPausandoChave(item.chave)
    setAtivoOverride(prev => ({ ...prev, [item.chave]: proximo }))
    try {
      await gravarOverridesComplemento({
        vinculos: [
          {
            menuId,
            produtoId: item.produtoId,
            complementoId,
            grupoComplementoId: item.grupoId,
            ativo: proximo,
          },
        ],
      })
      showToast.success(
        proximo ? 'Complemento ativado neste produto.' : 'Complemento pausado neste produto.'
      )
    } catch (error) {
      setAtivoOverride(prev => {
        const next = { ...prev }
        delete next[item.chave]
        return next
      })
      showToast.error(handleApiError(error))
    } finally {
      setPausandoChave(null)
      await invalidate(['menu-complemento-usos', menuId, complementoId])
    }
  }

  const aplicarAtivoLote = async (ativo: boolean) => {
    if (!complementoId || !podeAtivoLote) return
    const marcados = linhas.filter(item => selecionados.has(item.chave))
    if (marcados.length === 0) return
    const paraAtualizar = filtrarLinhasParaAtivoAlvo(
      marcados.map(item => ({
        ...item,
        ativoAtual: complementoAtivoDaLinha(item),
      })),
      ativo
    )
    if (paraAtualizar.length === 0) {
      showToast.success(
        ativo
          ? 'Os itens marcados já estavam ativos.'
          : 'Os itens marcados já estavam pausados.'
      )
      return
    }
    const overrideAnterior = { ...ativoOverride }
    setSalvando(true)
    setAtivoOverride(prev => {
      const next = { ...prev }
      for (const item of paraAtualizar) next[item.chave] = ativo
      return next
    })
    try {
      const vinculos = paraAtualizar.map(item => ({
        menuId,
        produtoId: item.produtoId,
        complementoId,
        grupoComplementoId: item.grupoId,
        ativo,
      }))
      for (const lote of partirEmLotes(vinculos, LIMITE_VINCULOS_OVERRIDE)) {
        await gravarOverridesComplemento({ vinculos: lote })
      }
      setSelecionados(new Set())
      showToast.success(
        ativo
          ? paraAtualizar.length === 1
            ? 'Complemento ativado em 1 item.'
            : `Complemento ativado em ${paraAtualizar.length} itens.`
          : paraAtualizar.length === 1
            ? 'Complemento pausado em 1 item.'
            : `Complemento pausado em ${paraAtualizar.length} itens.`
      )
    } catch (error) {
      setAtivoOverride(overrideAnterior)
      showToast.error(handleApiError(error))
    } finally {
      setSalvando(false)
      await invalidate(['menu-complemento-usos', menuId, complementoId])
    }
  }

  const aplicar = async () => {
    if (!complementoId || !podeAplicar) return
    const valor = lerMoeda(novoValor)
    const marcados = linhas.filter(item => selecionados.has(item.chave))
    if (marcados.length === 0) return
    setSalvando(true)
    try {
      const vinculos = marcados.map(item => ({
        menuId,
        produtoId: item.produtoId,
        complementoId,
        grupoComplementoId: item.grupoId,
        valor: valorComplementoNoModo(item.valorAtual, valor, modoValor),
      }))
      for (const lote of partirEmLotes(vinculos, LIMITE_VINCULOS_OVERRIDE)) {
        await gravarOverridesComplemento({ vinculos: lote })
      }
      setSelecionados(new Set())
      setNovoValor('')
      showToast.success(
        marcados.length === 1
          ? 'Valor atualizado em 1 item deste cardápio.'
          : `Valor atualizado em ${marcados.length} itens deste cardápio.`
      )
    } catch (error) {
      showToast.error(handleApiError(error))
    } finally {
      setSalvando(false)
      await invalidate(['menu-complemento-usos', menuId, complementoId])
    }
  }

  return (
    <MenuCardapioChrome menuId={menuId} nomeMenu={menu?.nome ?? ''} aba="complementos">
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-3 px-2 pt-2 md:px-4">
        <h1 className="text-lg font-semibold text-primary md:text-xl">Alterar valor do complemento em lote</h1>
        {gruposSelecionados.size > 0 && complemento ? (
          <div className="flex shrink-0 items-center gap-2">
            <div
              className="inline-flex h-8 items-center rounded-lg border border-secondary bg-white p-[3px]"
              role="group"
              aria-label="Como aplicar o valor"
            >
              {MODOS_VALOR_COMPLEMENTO_LOTE.map(modo => (
                <button
                  key={modo.id}
                  type="button"
                  disabled={salvando}
                  onClick={() => setModoValor(modo.id)}
                  className={cn(
                    'flex h-full items-center rounded-md px-3 text-xs font-semibold leading-none transition-colors',
                    modoValor === modo.id
                      ? 'bg-secondary text-white'
                      : 'text-secondary hover:bg-secondary/10 hover:text-secondary'
                  )}
                >
                  {modo.label}
                </button>
              ))}
            </div>
            <div
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-secondary bg-white p-[3px]"
              role="group"
              aria-label="Pausar ou ativar em lote"
            >
              <button
                type="button"
                disabled={!podeAtivoLote}
                onClick={() => void aplicarAtivoLote(false)}
                aria-label="Pausar complemento nos produtos marcados"
                title="Pausar nos marcados"
                className="flex h-full w-8 items-center justify-center rounded-md text-red-600 transition-colors hover:bg-red-600/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <MdPause size={18} />
              </button>
              <button
                type="button"
                disabled={!podeAtivoLote}
                onClick={() => void aplicarAtivoLote(true)}
                aria-label="Ativar complemento nos produtos marcados"
                title="Ativar nos marcados"
                className="flex h-full w-8 items-center justify-center rounded-md text-accent5 transition-colors hover:bg-accent5/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <MdPlayArrow size={20} />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden p-2">
        <div className="flex min-h-[320px] min-w-0 flex-1 overflow-x-auto overflow-y-hidden rounded-lg border border-gray-200 bg-white">
          <div className="flex min-h-0 min-w-[980px] flex-1">
            <Coluna
              titulo="Complementos"
              carregando={gruposQuery.isLoading && complementos.length === 0}
              erro={gruposQuery.error ? handleApiError(gruposQuery.error) : null}
              vazio={complementos.length === 0}
              vazioTexto="Nenhum complemento neste cardápio."
              semResultado={complementos.length > 0 && complementosFiltrados.length === 0}
              semResultadoTexto={`Nenhum complemento encontrado para “${buscaComplemento.trim()}”.`}
              busca={
                <BuscaColuna
                  id="busca-complementos-lote"
                  value={buscaComplemento}
                  onChange={setBuscaComplemento}
                  placeholder="Buscar complemento..."
                />
              }
            >
              {complementosFiltrados.map(item => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => escolherComplemento(item.id)}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 rounded-lg border-2 px-3 py-2 text-left transition-colors',
                      item.id === complementoId
                        ? 'border-secondary bg-gray-100 text-primary-text'
                        : 'border-gray-200 text-primary-text hover:border-gray-300'
                    )}
                  >
                    <span className="truncate text-sm">{item.nome}</span>
                    <span className="shrink-0 text-xs text-alternate">
                      {item.grupos === 1 ? '1 grupo' : `${item.grupos} grupos`}
                    </span>
                  </button>
                </li>
              ))}
            </Coluna>

            <Coluna
              titulo="Grupos"
              vazio={!complemento || gruposDoComplemento.length === 0}
              vazioTexto={complemento ? 'Nenhum grupo deste cardápio usa este complemento.' : 'Selecione um complemento.'}
              semResultado={gruposDoComplemento.length > 0 && gruposFiltrados.length === 0}
              semResultadoTexto={`Nenhum grupo encontrado para “${buscaGrupo.trim()}”.`}
              busca={
                <BuscaColuna
                  id="busca-grupos-lote"
                  value={buscaGrupo}
                  onChange={setBuscaGrupo}
                  placeholder="Buscar grupo..."
                />
              }
              cabecalho={
                complemento && gruposFiltrados.length > 0 ? (
                  <label className="flex cursor-pointer items-center gap-2 border-b border-gray-200 px-2 py-2">
                    <Checkbox
                      {...iconesCheckboxLote}
                      size="small"
                      checked={todosGruposMarcados}
                      indeterminate={!todosGruposMarcados && algumGrupoMarcado}
                      disabled={salvando}
                      onChange={() => alternarGrupos(gruposFiltrados.map(item => item.id))}
                      inputProps={{ 'aria-label': 'Marcar todos os grupos' }}
                    />
                    <span className="text-xs font-semibold text-secondary-text">Marcar todos</span>
                  </label>
                ) : null
              }
            >
              {gruposFiltrados.map(item => (
                <li key={item.id}>
                  <label
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-lg border-2 px-2 py-2 transition-colors',
                      gruposSelecionados.has(item.id)
                        ? 'border-secondary bg-gray-100'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <Checkbox
                      {...iconesCheckboxLote}
                      size="small"
                      checked={gruposSelecionados.has(item.id)}
                      disabled={salvando}
                      onChange={() => alternarGrupos([item.id])}
                      inputProps={{ 'aria-label': `Marcar grupo ${item.nome}` }}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm text-primary-text">{item.nome}</span>
                  </label>
                </li>
              ))}
            </Coluna>

            <Coluna
              titulo="Produtos"
              className="min-w-[420px] flex-[1.4]"
              carregando={Boolean(complemento) && usosQuery.isLoading && linhas.length === 0 && gruposSelecionados.size > 0}
              erro={usosQuery.error ? handleApiError(usosQuery.error) : null}
              vazio={gruposSelecionados.size === 0 || linhas.length === 0}
              vazioTexto={
                gruposSelecionados.size > 0
                  ? 'Nenhum produto deste cardápio usa os grupos marcados.'
                  : 'Selecione um grupo.'
              }
              semResultado={linhas.length > 0 && linhasFiltradas.length === 0}
              semResultadoTexto={`Nenhum produto encontrado para “${buscaProduto.trim()}”.`}
              busca={
                <BuscaColuna
                  id="busca-produtos-lote"
                  value={buscaProduto}
                  onChange={setBuscaProduto}
                  placeholder="Buscar produto ou grupo..."
                />
              }
              tituloAcoes={
                gruposSelecionados.size > 0 && complemento ? (
                  <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                    <input
                      id="valor-lote-complemento"
                      type="text"
                      inputMode="numeric"
                      value={novoValor}
                      onChange={event => setNovoValor(formatarDigitacao(event.target.value))}
                      onFocus={event => event.target.select()}
                      placeholder="R$ 0,00"
                      disabled={salvando}
                      aria-label={`Valor de ${complemento.nome}`}
                      className="h-8 w-[7.5rem] shrink-0 rounded-lg border border-primary/70 bg-white px-2 text-center text-sm text-primary-text focus:border-primary focus:outline-none disabled:opacity-50"
                    />
                    <button
                      type="button"
                      disabled={!podeAplicar}
                      onClick={() => void aplicar()}
                      className="h-8 shrink-0 rounded-lg border border-solid border-white bg-transparent px-3 text-sm font-semibold text-white [-webkit-text-fill-color:#fff] hover:bg-transparent disabled:cursor-not-allowed"
                    >
                      {salvando ? 'Aplicando…' : `Aplicar (${selecionados.size})`}
                    </button>
                  </div>
                ) : null
              }
              cabecalho={
                linhasFiltradas.length > 0 ? (
                  <label className="flex cursor-pointer items-center gap-2 border-b border-gray-200 px-2 py-1">
                    <Checkbox
                      {...iconesCheckboxLote}
                      size="small"
                      checked={todosMarcados}
                      indeterminate={!todosMarcados && algumMarcado}
                      disabled={salvando}
                      onChange={() => alternarProdutos(linhasFiltradas.map(item => item.chave))}
                      inputProps={{ 'aria-label': 'Marcar todos os produtos' }}
                    />
                    <span className="text-xs font-semibold text-secondary-text">Marcar todos</span>
                  </label>
                ) : null
              }
            >
              {linhasFiltradas.map(item => {
                const complementoAtivo = complementoAtivoDaLinha(item)
                return (
                  <li key={item.chave}>
                    <div
                      className={cn(
                        'flex items-center gap-2 rounded-lg border-2 px-2 py-2 transition-colors',
                        selecionados.has(item.chave)
                          ? 'border-secondary bg-gray-100'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                        <Checkbox
                          {...iconesCheckboxLote}
                          size="small"
                          checked={selecionados.has(item.chave)}
                          disabled={salvando}
                          onChange={() => alternarProdutos([item.chave])}
                          inputProps={{ 'aria-label': `Marcar ${item.produtoNome} em ${item.grupoNome}` }}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-primary-text">
                            {item.produtoNome}
                            {item.produtoAtivo ? null : (
                              <span className="ml-2 text-xs text-secondary-text">inativo</span>
                            )}
                          </span>
                          <span className="block truncate text-xs text-alternate">{item.grupoNome}</span>
                        </span>
                        <span className="shrink-0 text-sm text-primary-text">{formatarMoeda(item.valorAtual)}</span>
                      </label>
                      <BotaoAtivoComplemento
                        ativo={complementoAtivo}
                        disabled={salvando || pausandoChave === item.chave}
                        onToggle={() => void alternarAtivoLinha(item)}
                      />
                    </div>
                  </li>
                )
              })}
            </Coluna>
          </div>
        </div>
      </div>
    </div>
    </MenuCardapioChrome>
  )
}

function BuscaColuna({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <div className="relative border-b border-gray-200 px-2 py-2">
      <MdSearch
        size={16}
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-secondary-text"
      />
      <input
        id={id}
        type="text"
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-8 w-full rounded-lg border border-gray-200 bg-white pl-8 pr-2 text-sm text-primary-text placeholder:text-secondary-text focus:border-primary focus:outline-none"
      />
    </div>
  )
}

function Coluna({
  titulo,
  carregando = false,
  erro = null,
  vazio = false,
  vazioTexto,
  semResultado = false,
  semResultadoTexto,
  tituloAcoes,
  busca,
  cabecalho,
  className,
  children,
}: {
  titulo: string
  carregando?: boolean
  erro?: string | null
  vazio?: boolean
  vazioTexto: string
  semResultado?: boolean
  semResultadoTexto?: string
  tituloAcoes?: ReactNode
  busca?: ReactNode
  cabecalho?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <section className={cn('flex min-h-0 min-w-[240px] flex-1 flex-col border-r border-gray-200 last:border-r-0', className)}>
      <div className="flex min-h-12 items-center gap-2 border-b border-secondary bg-secondary px-3 py-2">
        <h2 className="shrink-0 text-sm font-semibold text-white">{titulo}</h2>
        {tituloAcoes}
      </div>
      {busca}
      {cabecalho}
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {carregando ? (
          <div className="flex justify-center py-8">
            <JiffyLoading />
          </div>
        ) : erro ? (
          <p className="px-2 py-6 text-center text-sm text-red-600">{erro}</p>
        ) : vazio ? (
          <p className="px-2 py-6 text-center text-sm text-secondary-text">{vazioTexto}</p>
        ) : semResultado ? (
          <p className="px-2 py-6 text-center text-sm text-secondary-text">{semResultadoTexto}</p>
        ) : (
          <ul className="space-y-1">{children}</ul>
        )}
      </div>
    </section>
  )
}
