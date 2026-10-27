'use client'

import { useMemo, useState } from 'react'
import { Checkbox, FormControlLabel } from '@mui/material'
import { MdSearch } from 'react-icons/md'
import { Complemento } from '@/src/domain/entities/Complemento'
import { normalizarTipoImpactoPreco } from '@/src/domain/complemento/tipos'
import { useComplementos } from '@/src/presentation/hooks/useComplementos'
import {
  useAtualizarPrecosPizzaComplementoMutation,
  useDesvincularPizzaComplementoMutation,
  usePizzaComplementos,
  useVincularPizzaComplementoMutation,
} from '@/src/presentation/hooks/pizza/usePizza'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import { PizzaCurrencyTextField } from '@/src/presentation/components/features/pizza/PizzaCurrencyTextField'
import { showToast } from '@/src/shared/utils/toast'
import type {
  ComplementoPizza,
  PrecoComplementoPizza,
  TipoImpactoPreco,
} from '@/src/shared/types/pizza'

type FilterTab = 'vinculados' | 'catalogo' | 'todos'

const EMPTY_COMPLEMENTOS: Complemento[] = []

interface PizzaComplementoTamanhoOption {
  id: string
  nome: string
}

interface PizzaCategoriaAdicionaisTabProps {
  categoriaId: string
  tamanhos: Array<{ id?: string; nome: string; ativo: boolean }>
}

export interface PizzaComplementoPrecoEditorProps {
  tamanhos: PizzaComplementoTamanhoOption[]
  precos: PrecoComplementoPizza[]
  tipoImpactoPreco: TipoImpactoPreco
  valorInicial?: number
  iniciarTodosSelecionados?: boolean
  pending: boolean
  onSave: (precos: PrecoComplementoPizza[]) => void | Promise<void>
  saveLabel?: string
}

export function nomeImpactoPizzaComplemento(tipoImpactoPreco: TipoImpactoPreco) {
  if (tipoImpactoPreco === 'aumenta') return 'Acréscimo'
  if (tipoImpactoPreco === 'diminui') return 'Desconto'
  return 'Sem impacto de preço'
}

export function PizzaComplementoPrecoEditor({
  tamanhos,
  precos,
  tipoImpactoPreco,
  valorInicial,
  iniciarTodosSelecionados = false,
  pending,
  onSave,
  saveLabel = 'Salvar preços',
}: PizzaComplementoPrecoEditorProps) {
  const [valores, setValores] = useState(() => {
    const existentes = new Map(precos.map(preco => [preco.pizzaTamanhoId, preco.valor]))
    return Object.fromEntries(
      tamanhos.map(tamanho => {
        const temPreco = existentes.has(tamanho.id)
        const valorBruto =
          tipoImpactoPreco === 'nenhum'
            ? 0
            : (existentes.get(tamanho.id) ?? valorInicial ?? 0)
        const valor = Number.isFinite(valorBruto) ? Math.max(0, valorBruto) : 0
        return [
          tamanho.id,
          {
            ativo: temPreco || iniciarTodosSelecionados,
            valor,
          },
        ]
      })
    )
  })

  const handleSalvar = async () => {
    const selecionados = tamanhos.filter(tamanho => valores[tamanho.id]?.ativo)
    if (selecionados.length === 0) {
      showToast.error('Selecione ao menos um tamanho para disponibilizar este adicional')
      return
    }

    const novosPrecos: PrecoComplementoPizza[] = []
    for (const tamanho of selecionados) {
      if (tipoImpactoPreco === 'nenhum') {
        novosPrecos.push({ pizzaTamanhoId: tamanho.id, valor: 0 })
        continue
      }
      const valor = valores[tamanho.id]?.valor
      if (!Number.isFinite(valor) || valor < 0) {
        showToast.error(`Informe um preço válido para o tamanho ${tamanho.nome}`)
        return
      }
      novosPrecos.push({ pizzaTamanhoId: tamanho.id, valor })
    }

    await onSave(novosPrecos)
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {tamanhos.map(tamanho => {
          const valor = valores[tamanho.id]
          return (
            <div
              key={tamanho.id}
              className="flex flex-col gap-2 rounded-lg border border-gray-200 px-3 py-2"
            >
              <FormControlLabel
                className="m-0 min-w-0"
                control={
                  <Checkbox
                    size="small"
                    checked={valor?.ativo ?? false}
                    onChange={event =>
                      setValores(current => ({
                        ...current,
                        [tamanho.id]: {
                          ...current[tamanho.id],
                          ativo: event.target.checked,
                        },
                      }))
                    }
                  />
                }
                label={<span className="truncate text-sm">{tamanho.nome}</span>}
              />
              <PizzaCurrencyTextField
                size="small"
                fullWidth
                label={
                  tipoImpactoPreco === 'aumenta'
                    ? 'Acréscimo'
                    : tipoImpactoPreco === 'diminui'
                      ? 'Desconto'
                      : 'Valor'
                }
                value={valor?.valor ?? 0}
                disabled={!valor?.ativo || tipoImpactoPreco === 'nenhum'}
                onChange={novoValor =>
                  setValores(current => ({
                    ...current,
                    [tamanho.id]: {
                      ...current[tamanho.id],
                      valor: Math.max(0, novoValor),
                    },
                  }))
                }
              />
            </div>
          )
        })}
      </div>
      <button
        type="button"
        onClick={() => void handleSalvar()}
        disabled={pending || tamanhos.length === 0}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? 'Salvando...' : saveLabel}
      </button>
    </div>
  )
}

export function PizzaCategoriaAdicionaisTab({
  categoriaId,
  tamanhos,
}: PizzaCategoriaAdicionaisTabProps) {
  const tamanhosDisponiveis = useMemo(
    () =>
      tamanhos
        .filter((tamanho): tamanho is { id: string; nome: string; ativo: boolean } =>
          Boolean(tamanho.id && tamanho.ativo)
        )
        .map(({ id, nome }) => ({ id, nome })),
    [tamanhos]
  )
  const complementosQuery = usePizzaComplementos(categoriaId)
  const cadastroQuery = useComplementos({ limit: 2000 })
  const vincularMutation = useVincularPizzaComplementoMutation()
  const precosMutation = useAtualizarPrecosPizzaComplementoMutation()
  const desvincularMutation = useDesvincularPizzaComplementoMutation()

  const [searchTerm, setSearchTerm] = useState('')
  const [filterTab, setFilterTab] = useState<FilterTab>('vinculados')
  const [pendenteComplementoId, setPendenteComplementoId] = useState<string | null>(null)

  const catalogo = cadastroQuery.data ?? EMPTY_COMPLEMENTOS
  const complementosVinculados = complementosQuery.data ?? []
  const vinculadosByComplementoId = useMemo(() => {
    const map = new Map<string, ComplementoPizza>()
    for (const item of complementosVinculados) {
      map.set(item.complementoId, item)
    }
    return map
  }, [complementosVinculados])
  const idsVinculados = useMemo(
    () => new Set(complementosVinculados.map(item => item.complementoId)),
    [complementosVinculados]
  )

  const complementoPendente = useMemo(
    () =>
      pendenteComplementoId
        ? (catalogo.find(item => item.getId() === pendenteComplementoId) ?? null)
        : null,
    [catalogo, pendenteComplementoId]
  )

  const filterCounts = useMemo(() => {
    let vinculados = 0
    let catalogoAtivos = 0
    for (const item of catalogo) {
      const linked = idsVinculados.has(item.getId())
      if (linked && item.isAtivo()) vinculados += 1
      if (!linked && item.isAtivo()) catalogoAtivos += 1
    }
    return {
      vinculados,
      catalogo: catalogoAtivos,
      todos: catalogo.length,
    }
  }, [catalogo, idsVinculados])

  const listaFiltrada = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    const bySearch = !term
      ? catalogo
      : catalogo.filter(item => {
          const nome = item.getNome()?.toLowerCase() || ''
          const descricao = item.getDescricao()?.toLowerCase() || ''
          return nome.includes(term) || descricao.includes(term)
        })

    if (filterTab === 'vinculados') {
      return bySearch.filter(item => idsVinculados.has(item.getId()) && item.isAtivo())
    }
    if (filterTab === 'catalogo') {
      return bySearch.filter(item => !idsVinculados.has(item.getId()) && item.isAtivo())
    }

    const vinculados: Complemento[] = []
    const naoVinculados: Complemento[] = []
    for (const item of bySearch) {
      if (idsVinculados.has(item.getId())) vinculados.push(item)
      else naoVinculados.push(item)
    }
    return [...vinculados, ...naoVinculados]
  }, [catalogo, searchTerm, filterTab, idsVinculados])

  const tipoImpactoPendente = normalizarTipoImpactoPreco(
    complementoPendente?.getTipoImpactoPreco()
  )

  const iniciarVinculo = (complementoId: string) => {
    if (tamanhosDisponiveis.length === 0) {
      showToast.error('Salve ao menos um tamanho ativo antes de vincular adicionais')
      return
    }
    if (idsVinculados.has(complementoId)) return
    setPendenteComplementoId(complementoId)
    setFilterTab('vinculados')
  }

  const handleToggleVinculo = async (complementoId: string, checked: boolean) => {
    if (checked) {
      iniciarVinculo(complementoId)
      return
    }

    if (pendenteComplementoId === complementoId) {
      setPendenteComplementoId(null)
      return
    }

    const vinculado = vinculadosByComplementoId.get(complementoId)
    if (!vinculado) return
    await handleDesvincular(vinculado)
  }

  const handleVincular = async (precos: PrecoComplementoPizza[]) => {
    if (!complementoPendente) return
    try {
      await vincularMutation.mutateAsync({
        categoriaPizzaId: categoriaId,
        complementoId: complementoPendente.getId(),
        precos,
      })
      showToast.success('Adicional vinculado à categoria')
      setPendenteComplementoId(null)
      setFilterTab('vinculados')
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Erro ao vincular adicional')
    }
  }

  const handleSalvarPrecos = async (
    complemento: ComplementoPizza,
    precos: PrecoComplementoPizza[]
  ) => {
    try {
      await precosMutation.mutateAsync({
        id: complemento.id,
        categoriaPizzaId: categoriaId,
        input: { precos },
      })
      showToast.success(`Preços de ${complemento.nome} atualizados`)
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Erro ao atualizar preços')
    }
  }

  const handleDesvincular = async (complemento: ComplementoPizza) => {
    if (!window.confirm(`Desvincular "${complemento.nome}" desta categoria de pizza?`)) return
    try {
      await desvincularMutation.mutateAsync({
        id: complemento.id,
        categoriaPizzaId: categoriaId,
      })
      showToast.success('Adicional desvinculado da categoria')
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Erro ao desvincular adicional')
    }
  }

  const isLoading = cadastroQuery.isLoading || complementosQuery.isLoading
  const labels: Record<FilterTab, string> = {
    vinculados: 'Nesta categoria',
    catalogo: 'Disponíveis',
    todos: 'Todos',
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden p-4 md:p-6">
      <header className="mb-3 shrink-0">
        <h2 className="text-lg font-semibold text-primary-text">Adicionais da pizza</h2>
        <p className="mt-1 text-sm text-secondary-text">
          Selecione em Disponíveis e defina o preço por tamanho em Nesta categoria. O cadastro
          global do complemento não será alterado.
        </p>
      </header>

      {tamanhosDisponiveis.length === 0 ? (
        <div className="mb-3 shrink-0 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Salve ao menos um tamanho ativo da categoria antes de configurar os adicionais.
        </div>
      ) : null}

      <div className="mb-3 flex shrink-0 flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={event => setSearchTerm(event.target.value)}
            placeholder="Buscar..."
            className="h-8 w-full min-w-0 rounded-lg border border-gray-200 pl-9 pr-4 text-sm text-primary-text placeholder:text-secondary-text focus:border-primary focus:outline-none"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text">
            <MdSearch size={16} />
          </span>
        </div>
        <div className="flex h-8 shrink-0 overflow-hidden rounded-lg border border-gray-200 text-xs font-medium">
          {(['vinculados', 'catalogo', 'todos'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilterTab(tab)}
              className={`flex h-full items-center gap-1.5 px-3 transition-colors ${
                filterTab === tab
                  ? 'bg-primary text-white'
                  : 'bg-white text-secondary-text hover:bg-gray-50'
              }`}
            >
              <span>{labels[tab]}</span>
              <span
                className={`tabular-nums ${
                  filterTab === tab ? 'text-white/80' : 'text-secondary-text/80'
                }`}
              >
                ({filterCounts[tab]})
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : null}

        {!isLoading && (cadastroQuery.isError || complementosQuery.isError) ? (
          <p className="py-6 text-center text-sm text-error">
            {cadastroQuery.error instanceof Error
              ? cadastroQuery.error.message
              : complementosQuery.error instanceof Error
                ? complementosQuery.error.message
                : 'Erro ao carregar adicionais da pizza'}
          </p>
        ) : null}

        {!isLoading && !cadastroQuery.isError && !complementosQuery.isError ? (
          <>
            {filterTab === 'vinculados' ? (
              <div className="space-y-3">
                {complementoPendente ? (
                  <article className="space-y-4 rounded-xl border border-primary/40 bg-primary/5 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                          Novo vínculo — defina os preços por tamanho
                        </p>
                        <h4 className="mt-1 font-medium text-primary-text">
                          {complementoPendente.getNome()}
                        </h4>
                        {complementoPendente.getDescricao()?.trim() ? (
                          <p className="mt-1 text-sm text-secondary-text">
                            {complementoPendente.getDescricao()}
                          </p>
                        ) : null}
                        <p className="mt-1 text-sm text-secondary-text">
                          Impacto: {nomeImpactoPizzaComplemento(tipoImpactoPendente)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPendenteComplementoId(null)}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-secondary-text hover:bg-white"
                      >
                        Cancelar
                      </button>
                    </div>
                    <PizzaComplementoPrecoEditor
                      key={`pendente-${complementoPendente.getId()}`}
                      tamanhos={tamanhosDisponiveis}
                      precos={[]}
                      tipoImpactoPreco={tipoImpactoPendente}
                      valorInicial={
                        tipoImpactoPendente === 'nenhum' ? 0 : complementoPendente.getValor()
                      }
                      iniciarTodosSelecionados
                      pending={vincularMutation.isPending}
                      onSave={handleVincular}
                    />
                  </article>
                ) : null}

                {listaFiltrada.length === 0 && !complementoPendente ? (
                  <p className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-sm text-secondary-text">
                    Nenhum adicional nesta categoria. Selecione em Disponíveis para vincular.
                  </p>
                ) : null}

                {listaFiltrada.map(item => {
                  const vinculado = vinculadosByComplementoId.get(item.getId())
                  if (!vinculado) return null
                  return (
                    <article
                      key={vinculado.id}
                      className="space-y-4 rounded-xl border border-gray-200 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h4 className="font-medium text-primary-text">{vinculado.nome}</h4>
                          {vinculado.descricao ? (
                            <p className="mt-1 text-sm text-secondary-text">{vinculado.descricao}</p>
                          ) : null}
                          <p className="mt-1 text-sm text-secondary-text">
                            Impacto: {nomeImpactoPizzaComplemento(vinculado.tipoImpactoPreco)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <JiffyIconSwitch
                            checked
                            onChange={event => {
                              event.stopPropagation()
                              void handleToggleVinculo(item.getId(), event.target.checked)
                            }}
                            disabled={desvincularMutation.isPending}
                            bordered={false}
                            size="sm"
                            inputProps={{ 'aria-label': 'Desvincular' }}
                          />
                          <button
                            type="button"
                            onClick={() => void handleDesvincular(vinculado)}
                            disabled={desvincularMutation.isPending}
                            className="rounded-lg border border-error px-3 py-1.5 text-sm font-medium text-error disabled:opacity-50"
                          >
                            Desvincular
                          </button>
                        </div>
                      </div>
                      <PizzaComplementoPrecoEditor
                        key={`${vinculado.id}-${complementosQuery.dataUpdatedAt}`}
                        tamanhos={tamanhosDisponiveis}
                        precos={vinculado.precos}
                        tipoImpactoPreco={vinculado.tipoImpactoPreco}
                        pending={precosMutation.isPending}
                        onSave={precos => handleSalvarPrecos(vinculado, precos)}
                      />
                    </article>
                  )
                })}
              </div>
            ) : (
              <div>
                {listaFiltrada.length === 0 ? (
                  <p className="py-6 text-center text-sm text-secondary-text">
                    Nenhum complemento encontrado.
                  </p>
                ) : (
                  <>
                    <div
                      className="sticky top-0 z-10 mb-1 hidden items-center gap-3 border-b border-gray-200 bg-white px-2 py-1.5 sm:grid"
                      style={{ gridTemplateColumns: 'minmax(0,1fr) 7rem 3.25rem' }}
                    >
                      <span className="text-xs font-semibold text-secondary-text">Complemento</span>
                      <span className="text-center text-xs font-semibold text-secondary-text">
                        Impacto
                      </span>
                      <span className="text-center text-xs font-semibold text-secondary-text">
                        Vínculo
                      </span>
                    </div>
                    {listaFiltrada.map(item => {
                      const id = item.getId()
                      const isLinked = idsVinculados.has(id)
                      const isPendente = pendenteComplementoId === id
                      const tipo = normalizarTipoImpactoPreco(item.getTipoImpactoPreco())
                      const descricao = item.getDescricao()?.trim()
                      return (
                        <div
                          key={id}
                          className={`border-b border-gray-100 px-2 py-2 transition-colors hover:bg-primary-bg/40 ${
                            isLinked || isPendente ? '' : 'opacity-80'
                          }`}
                        >
                          <div
                            className="hidden items-center gap-3 sm:grid"
                            style={{ gridTemplateColumns: 'minmax(0,1fr) 7rem 3.25rem' }}
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-primary-text">
                                {item.getNome()}
                              </p>
                              {descricao ? (
                                <p className="truncate text-xs text-secondary-text">{descricao}</p>
                              ) : null}
                              {!item.isAtivo() ? (
                                <p className="text-xs text-amber-700">Inativo no cadastro</p>
                              ) : null}
                              {isPendente ? (
                                <p className="text-xs font-medium text-primary">
                                  Aguardando preços em Nesta categoria
                                </p>
                              ) : null}
                            </div>
                            <span className="block text-center text-[11px] text-secondary-text">
                              {nomeImpactoPizzaComplemento(tipo)}
                            </span>
                            <div className="flex justify-center">
                              <JiffyIconSwitch
                                checked={isLinked || isPendente}
                                onChange={event => {
                                  event.stopPropagation()
                                  void handleToggleVinculo(id, event.target.checked)
                                }}
                                disabled={
                                  desvincularMutation.isPending ||
                                  vincularMutation.isPending ||
                                  (!isLinked && !item.isAtivo())
                                }
                                bordered={false}
                                size="sm"
                                inputProps={{
                                  'aria-label':
                                    isLinked || isPendente ? 'Desvincular' : 'Vincular',
                                }}
                              />
                            </div>
                          </div>

                          <div className="flex items-start justify-between gap-2 sm:hidden">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-primary-text">
                                {item.getNome()}
                              </p>
                              {descricao ? (
                                <p className="truncate text-xs text-secondary-text">{descricao}</p>
                              ) : null}
                              <p className="mt-1 text-xs text-secondary-text">
                                {nomeImpactoPizzaComplemento(tipo)}
                              </p>
                              {isPendente ? (
                                <p className="text-xs font-medium text-primary">
                                  Aguardando preços em Nesta categoria
                                </p>
                              ) : null}
                            </div>
                            <JiffyIconSwitch
                              checked={isLinked || isPendente}
                              onChange={event => {
                                event.stopPropagation()
                                void handleToggleVinculo(id, event.target.checked)
                              }}
                              disabled={
                                desvincularMutation.isPending ||
                                vincularMutation.isPending ||
                                (!isLinked && !item.isAtivo())
                              }
                              bordered={false}
                              size="sm"
                              inputProps={{
                                'aria-label':
                                  isLinked || isPendente ? 'Desvincular' : 'Vincular',
                              }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </>
                )}
              </div>
            )}
          </>
        ) : null}
      </div>
    </section>
  )
}
