'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { MdSearch } from 'react-icons/md'
import type { TipoImpactoPreco } from '@/src/domain/complemento/tipos'
import {
  listarLinhasImpactoLote,
  montarParesImpactoLote,
  partirParesImpactoEmLotes,
  TIPOS_IMPACTO_LOTE,
  type GrupoImpactoLote,
} from '@/src/application/complementos/impactoComplementoLote'
import { compararNomePt } from '@/src/application/complementos/menuComplementoLote'
import {
  buscarGrupoImpactoLote,
  gravarOverridesComplemento,
} from '@/src/presentation/components/features/complementos/complementoOverrideApi'
import { GrupoComplemento } from '@/src/domain/entities/GrupoComplemento'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { Checkbox } from '@/src/presentation/components/ui/checkbox'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { JiffySidePanelModal } from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { handleApiError, showToast } from '@/src/shared/utils/toast'
import { cn } from '@/src/shared/utils/cn'

function contemBusca(texto: string, busca: string): boolean {
  const termo = busca.trim().toLocaleLowerCase('pt-BR')
  if (!termo) return true
  return texto.toLocaleLowerCase('pt-BR').includes(termo)
}

function labelImpacto(impacto: TipoImpactoPreco): string {
  if (impacto === 'aumenta') return 'Aumenta'
  if (impacto === 'diminui') return 'Diminui'
  return 'Nenhum'
}

function IconeCheckboxMarcado() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden className="block">
      <rect width="20" height="20" rx="3" className="fill-primary" />
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
      <rect width="20" height="20" rx="3" className="fill-primary" />
      <path d="M5 10h10" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

const iconesCheckboxLote = {
  checkedIcon: <IconeCheckboxMarcado />,
  indeterminateIcon: <IconeCheckboxParcial />,
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
    <div className="relative">
      <input
        id={id}
        type="text"
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-8 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-primary-text placeholder:text-secondary-text focus:border-primary focus:outline-none"
      />
      <MdSearch
        size={16}
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-secondary-text"
      />
    </div>
  )
}

function Coluna({
  titulo,
  children,
  busca,
  cabecalho,
  tituloAcoes,
  carregando,
  erro,
  vazio,
  vazioTexto,
  semResultado,
  semResultadoTexto,
  className,
}: {
  titulo: string
  children: ReactNode
  busca?: ReactNode
  cabecalho?: ReactNode
  tituloAcoes?: ReactNode
  carregando?: boolean
  erro?: string | null
  vazio?: boolean
  vazioTexto?: string
  semResultado?: boolean
  semResultadoTexto?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex min-h-0 min-w-[280px] flex-1 flex-col border-r border-gray-200 last:border-r-0',
        className
      )}
    >
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-primary bg-primary px-3">
        <h3 className="text-sm font-semibold text-white">{titulo}</h3>
        {tituloAcoes}
      </div>
      {busca ? <div className="shrink-0 border-b border-gray-100 p-2">{busca}</div> : null}
      {cabecalho}
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {carregando ? (
          <div className="flex justify-center py-10">
            <JiffyLoading />
          </div>
        ) : erro ? (
          <p className="px-2 py-6 text-center text-sm text-red-600">{erro}</p>
        ) : vazio ? (
          <p className="px-2 py-6 text-center text-sm text-secondary-text">{vazioTexto}</p>
        ) : semResultado ? (
          <p className="px-2 py-6 text-center text-sm text-secondary-text">{semResultadoTexto}</p>
        ) : (
          <ul className="flex flex-col gap-1.5">{children}</ul>
        )}
      </div>
    </div>
  )
}

interface GrupoAlterarImpactoComplementosLoteProps {
  open: boolean
  onClose: () => void
}

export function GrupoAlterarImpactoComplementosLote({
  open,
  onClose,
}: GrupoAlterarImpactoComplementosLoteProps) {
  const invalidate = useInvalidateTenantQueries()
  const [buscaGrupo, setBuscaGrupo] = useState('')
  const [buscaComplemento, setBuscaComplemento] = useState('')
  const [gruposSelecionados, setGruposSelecionados] = useState<Set<string>>(() => new Set())
  const [linhasSelecionadas, setLinhasSelecionadas] = useState<Set<string>>(() => new Set())
  const [detalhesPorId, setDetalhesPorId] = useState<Record<string, GrupoImpactoLote>>({})
  const [carregandoDetalheIds, setCarregandoDetalheIds] = useState<Set<string>>(() => new Set())
  const [falhaDetalheIds, setFalhaDetalheIds] = useState<Set<string>>(() => new Set())
  const [erroDetalhe, setErroDetalhe] = useState<string | null>(null)
  const [impactoAlvo, setImpactoAlvo] = useState<TipoImpactoPreco>('aumenta')
  const [salvando, setSalvando] = useState(false)
  const [reloadDetalhesToken, setReloadDetalhesToken] = useState(0)

  const gruposQuery = useSecureTenantQuery(
    ['grupos-complementos', 'impacto-lote', 'lista'],
    async ({ token }) => {
      const LIMITE_PAGINA = 100
      const todos: GrupoComplemento[] = []
      let offset = 0
      let total: number | null = null

      while (total === null || offset < total) {
        const response = await fetchGestorApi(
          `/api/grupos-complementos?limit=${LIMITE_PAGINA}&offset=${offset}`,
          {
            cache: 'no-store',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          }
        )
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(
            errorData.error || errorData.message || 'Erro ao carregar grupos de complementos'
          )
        }
        const data = (await response.json()) as { items?: unknown[]; count?: number }
        const pagina = (data.items || []).map(item => GrupoComplemento.fromJSON(item))
        todos.push(...pagina)
        total = typeof data.count === 'number' ? data.count : todos.length
        offset += LIMITE_PAGINA
        if (pagina.length === 0 || pagina.length < LIMITE_PAGINA) break
      }

      return todos
    },
    { enabled: open, staleTime: 0, refetchOnMount: 'always' }
  )

  const gruposLista = useMemo(() => {
    const items = gruposQuery.data ?? []
    return [...items].sort((a, b) => {
      const porAtivo = Number(b.isAtivo()) - Number(a.isAtivo())
      if (porAtivo !== 0) return porAtivo
      return compararNomePt(a.getNome(), b.getNome())
    })
  }, [gruposQuery.data])

  const gruposFiltrados = useMemo(
    () => gruposLista.filter(grupo => contemBusca(grupo.getNome(), buscaGrupo)),
    [gruposLista, buscaGrupo]
  )

  const gruposAtivosFiltrados = useMemo(
    () => gruposFiltrados.filter(grupo => grupo.isAtivo()),
    [gruposFiltrados]
  )

  useEffect(() => {
    if (!open) {
      setBuscaGrupo('')
      setBuscaComplemento('')
      setGruposSelecionados(new Set())
      setLinhasSelecionadas(new Set())
      setDetalhesPorId({})
      setCarregandoDetalheIds(new Set())
      setFalhaDetalheIds(new Set())
      setErroDetalhe(null)
      setImpactoAlvo('aumenta')
      setSalvando(false)
      setReloadDetalhesToken(0)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const faltando = [...gruposSelecionados].filter(
      id => !detalhesPorId[id] && !carregandoDetalheIds.has(id) && !falhaDetalheIds.has(id)
    )
    if (faltando.length === 0) return

    let cancelado = false
    setCarregandoDetalheIds(prev => {
      const next = new Set(prev)
      for (const id of faltando) next.add(id)
      return next
    })
    setErroDetalhe(null)

    void (async () => {
      const ok: Array<readonly [string, GrupoImpactoLote]> = []
      const falhas: string[] = []
      let primeiraMensagem: string | null = null

      await Promise.all(
        faltando.map(async id => {
          try {
            const detalhe = await buscarGrupoImpactoLote(id)
            ok.push([id, detalhe])
          } catch (error) {
            falhas.push(id)
            if (!primeiraMensagem) primeiraMensagem = handleApiError(error)
          }
        })
      )

      if (cancelado) return

      if (ok.length > 0) {
        setDetalhesPorId(prev => {
          const next = { ...prev }
          for (const [id, detalhe] of ok) next[id] = detalhe
          return next
        })
      }
      if (falhas.length > 0) {
        setFalhaDetalheIds(prev => {
          const next = new Set(prev)
          for (const id of falhas) next.add(id)
          return next
        })
        setErroDetalhe(primeiraMensagem ?? 'Erro ao carregar grupos selecionados.')
      }
      setCarregandoDetalheIds(prev => {
        const next = new Set(prev)
        for (const id of faltando) next.delete(id)
        return next
      })
    })()

    return () => {
      cancelado = true
    }
    // carregandoDetalheIds / detalhesPorId deliberadamente fora: o filtro de faltando evita loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, gruposSelecionados, reloadDetalhesToken])

  const gruposCarregados = useMemo(
    () =>
      [...gruposSelecionados]
        .map(id => detalhesPorId[id])
        .filter((item): item is GrupoImpactoLote => Boolean(item)),
    [gruposSelecionados, detalhesPorId]
  )

  const linhas = useMemo(() => listarLinhasImpactoLote(gruposCarregados), [gruposCarregados])

  const linhasFiltradas = useMemo(
    () =>
      linhas.filter(item =>
        contemBusca(`${item.complementoNome} ${item.grupoNome}`, buscaComplemento)
      ),
    [linhas, buscaComplemento]
  )

  const carregandoComplementos =
    gruposSelecionados.size > 0 &&
    ([...gruposSelecionados].some(id => carregandoDetalheIds.has(id)) ||
      [...gruposSelecionados].some(id => !detalhesPorId[id]))

  const todosGruposMarcados =
    gruposAtivosFiltrados.length > 0 &&
    gruposAtivosFiltrados.every(item => gruposSelecionados.has(item.getId()))
  const algumGrupoMarcado = gruposAtivosFiltrados.some(item =>
    gruposSelecionados.has(item.getId())
  )
  const todosLinhasMarcadas =
    linhasFiltradas.length > 0 &&
    linhasFiltradas.every(item => linhasSelecionadas.has(item.chave))
  const algumaLinhaMarcada = linhasFiltradas.some(item => linhasSelecionadas.has(item.chave))

  const paresPrevistos = useMemo(
    () => montarParesImpactoLote(linhas, linhasSelecionadas, impactoAlvo),
    [linhas, linhasSelecionadas, impactoAlvo]
  )

  const podeAplicar =
    paresPrevistos.length > 0 && !salvando && !carregandoComplementos && !erroDetalhe

  const alternarGrupos = useCallback((ids: string[]) => {
    setGruposSelecionados(prev => {
      const next = new Set(prev)
      const todos = ids.length > 0 && ids.every(id => next.has(id))
      if (todos) {
        for (const id of ids) next.delete(id)
      } else {
        for (const id of ids) next.add(id)
        setFalhaDetalheIds(atual => {
          if (atual.size === 0) return atual
          const limpo = new Set(atual)
          for (const id of ids) limpo.delete(id)
          return limpo
        })
        setErroDetalhe(null)
      }
      setLinhasSelecionadas(atual => {
        if (atual.size === 0) return atual
        const filtrado = new Set<string>()
        for (const chave of atual) {
          const grupoId = chave.slice(0, chave.indexOf(':'))
          if (next.has(grupoId)) filtrado.add(chave)
        }
        return filtrado
      })
      return next
    })
  }, [])

  const alternarLinhas = useCallback((chaves: string[]) => {
    setLinhasSelecionadas(prev => {
      const next = new Set(prev)
      const todos = chaves.length > 0 && chaves.every(chave => next.has(chave))
      if (todos) {
        for (const chave of chaves) next.delete(chave)
      } else {
        for (const chave of chaves) next.add(chave)
      }
      return next
    })
  }, [])

  const aplicar = useCallback(async () => {
    const pares = montarParesImpactoLote(linhas, linhasSelecionadas, impactoAlvo)
    if (pares.length === 0) {
      showToast.error('Selecione grupos e complementos para aplicar.')
      return
    }

    setSalvando(true)
    try {
      let atualizados = 0
      for (const lote of partirParesImpactoEmLotes(pares)) {
        const resultado = await gravarOverridesComplemento({ grupos: lote })
        atualizados += resultado.atualizados ?? lote.length
      }

      const idsInvalidar = [...gruposSelecionados]
      setDetalhesPorId(prev => {
        const next = { ...prev }
        for (const id of idsInvalidar) delete next[id]
        return next
      })
      setFalhaDetalheIds(new Set())
      setReloadDetalhesToken(token => token + 1)

      await invalidate(['grupos-complementos'])
      for (const id of idsInvalidar) {
        await invalidate(['grupo-complemento', id])
      }

      showToast.success(
        atualizados === 1
          ? 'Impacto atualizado em 1 vínculo.'
          : `Impacto atualizado em ${atualizados} vínculos.`
      )
      setLinhasSelecionadas(new Set())
    } catch (error) {
      showToast.error(handleApiError(error))
    } finally {
      setSalvando(false)
    }
  }, [linhas, linhasSelecionadas, impactoAlvo, gruposSelecionados, invalidate])

  return (
    <JiffySidePanelModal
      open={open}
      onClose={onClose}
      title="Alterar impacto em lote"
      subtitle="O impacto vale no grupo, em todos os produtos e cardápios que o usam."
      scrollableBody={false}
      footerVariant="bar"
      panelClassName="w-[95vw] max-w-[100vw] sm:w-[min(960px,92vw)]"
      footerActions={{
        showCancel: true,
        cancelLabel: 'Fechar',
        onCancel: onClose,
        showSave: true,
        saveLabel: `Aplicar (${paresPrevistos.length})`,
        saveLoading: salvando,
        saveDisabled: !podeAplicar,
        onSave: () => {
          void aplicar()
        },
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-info">
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-gray-200 bg-white px-3 py-2">
          <span className="text-xs font-semibold text-secondary-text">Impacto alvo</span>
          <div
            className="inline-flex h-8 items-center rounded-lg border border-primary bg-white p-[3px]"
            role="group"
            aria-label="Tipo de impacto a aplicar"
          >
            {TIPOS_IMPACTO_LOTE.map(tipo => (
              <button
                key={tipo.id}
                type="button"
                disabled={salvando}
                onClick={() => setImpactoAlvo(tipo.id)}
                className={cn(
                  'flex h-full items-center rounded-md px-3 text-xs font-semibold leading-none transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                  impactoAlvo === tipo.id
                    ? 'bg-primary text-white'
                    : 'text-primary hover:bg-primary/10 hover:text-primary'
                )}
              >
                {tipo.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-secondary-text">
            Cada linha é o complemento em um grupo; marque as linhas e aplique o impacto alvo.
          </p>
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden p-2">
          <div className="flex min-h-[360px] min-w-0 flex-1 overflow-x-auto overflow-y-hidden rounded-lg border border-gray-200 bg-white">
            <div className="flex min-h-0 min-w-[640px] flex-1">
              <Coluna
                titulo="Grupos"
                carregando={gruposQuery.isLoading && gruposLista.length === 0}
                erro={gruposQuery.error ? handleApiError(gruposQuery.error) : null}
                vazio={gruposLista.length === 0}
                vazioTexto="Nenhum grupo de complementos cadastrado."
                semResultado={gruposLista.length > 0 && gruposFiltrados.length === 0}
                semResultadoTexto={`Nenhum grupo encontrado para “${buscaGrupo.trim()}”.`}
                busca={
                  <BuscaColuna
                    id="busca-grupos-impacto-lote"
                    value={buscaGrupo}
                    onChange={setBuscaGrupo}
                    placeholder="Buscar grupo..."
                  />
                }
                cabecalho={
                  gruposAtivosFiltrados.length > 0 ? (
                    <label className="flex cursor-pointer items-center gap-2 border-b border-gray-200 px-2 py-2">
                      <Checkbox
                        {...iconesCheckboxLote}
                        size="small"
                        checked={todosGruposMarcados}
                        indeterminate={!todosGruposMarcados && algumGrupoMarcado}
                        disabled={salvando}
                        onChange={() =>
                          alternarGrupos(gruposAtivosFiltrados.map(item => item.getId()))
                        }
                        inputProps={{ 'aria-label': 'Marcar todos os grupos' }}
                      />
                      <span className="text-xs font-semibold text-secondary-text">
                        Marcar todos
                      </span>
                    </label>
                  ) : null
                }
              >
                {gruposFiltrados.map(grupo => {
                  const id = grupo.getId()
                  const ativo = grupo.isAtivo()
                  return (
                    <li key={id}>
                      <label
                        className={cn(
                          'flex cursor-pointer items-center gap-2 rounded-lg border-2 px-2 py-2 transition-colors',
                          gruposSelecionados.has(id)
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:border-gray-300',
                          !ativo && 'opacity-60'
                        )}
                      >
                        <Checkbox
                          {...iconesCheckboxLote}
                          size="small"
                          checked={gruposSelecionados.has(id)}
                          disabled={salvando || !ativo}
                          onChange={() => alternarGrupos([id])}
                          inputProps={{ 'aria-label': `Marcar grupo ${grupo.getNome()}` }}
                        />
                        <span className="min-w-0 flex-1 truncate text-sm text-primary-text">
                          {grupo.getNome()}
                        </span>
                        {!ativo ? (
                          <span className="shrink-0 text-[10px] uppercase text-secondary-text">
                            Inativo
                          </span>
                        ) : null}
                      </label>
                    </li>
                  )
                })}
              </Coluna>

              <Coluna
                titulo="Complementos"
                carregando={carregandoComplementos}
                erro={erroDetalhe}
                vazio={gruposSelecionados.size === 0 || linhas.length === 0}
                vazioTexto={
                  gruposSelecionados.size > 0
                    ? 'Os grupos marcados não têm complementos.'
                    : 'Selecione um ou mais grupos.'
                }
                semResultado={linhas.length > 0 && linhasFiltradas.length === 0}
                semResultadoTexto={`Nenhum complemento encontrado para “${buscaComplemento.trim()}”.`}
                busca={
                  <BuscaColuna
                    id="busca-complementos-impacto-lote"
                    value={buscaComplemento}
                    onChange={setBuscaComplemento}
                    placeholder="Buscar complemento ou grupo..."
                  />
                }
                cabecalho={
                  linhasFiltradas.length > 0 ? (
                    <label className="flex cursor-pointer items-center gap-2 border-b border-gray-200 px-2 py-2">
                      <Checkbox
                        {...iconesCheckboxLote}
                        size="small"
                        checked={todosLinhasMarcadas}
                        indeterminate={!todosLinhasMarcadas && algumaLinhaMarcada}
                        disabled={salvando}
                        onChange={() =>
                          alternarLinhas(linhasFiltradas.map(item => item.chave))
                        }
                        inputProps={{ 'aria-label': 'Marcar todos os complementos' }}
                      />
                      <span className="text-xs font-semibold text-secondary-text">
                        Marcar todos
                      </span>
                    </label>
                  ) : null
                }
              >
                {linhasFiltradas.map(item => (
                  <li key={item.chave}>
                    <label
                      className={cn(
                        'flex cursor-pointer items-center gap-2 rounded-lg border-2 px-2 py-2 transition-colors',
                        linhasSelecionadas.has(item.chave)
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <Checkbox
                        {...iconesCheckboxLote}
                        size="small"
                        checked={linhasSelecionadas.has(item.chave)}
                        disabled={salvando}
                        onChange={() => alternarLinhas([item.chave])}
                        inputProps={{
                          'aria-label': `Marcar ${item.complementoNome} no grupo ${item.grupoNome}`,
                        }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-primary-text">
                          {item.complementoNome}
                        </span>
                        <span className="block truncate text-xs text-primary">
                          {item.grupoNome}
                        </span>
                      </span>
                      <span className="shrink-0 text-[11px] font-medium uppercase text-secondary-text">
                        {labelImpacto(item.tipoImpactoPreco)}
                      </span>
                    </label>
                  </li>
                ))}
              </Coluna>
            </div>
          </div>
        </div>
      </div>
    </JiffySidePanelModal>
  )
}
