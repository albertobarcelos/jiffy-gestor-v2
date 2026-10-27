'use client'

import { useMemo, useState } from 'react'
import { MdSearch } from 'react-icons/md'
import { Complemento } from '@/src/domain/entities/Complemento'
import { normalizarTipoImpactoPreco } from '@/src/domain/complemento/tipos'
import { useComplementos } from '@/src/presentation/hooks/useComplementos'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import { showToast } from '@/src/shared/utils/toast'
import type { PrecoComplementoPizza } from '@/src/shared/types/pizza'
import {
  createLocalId,
  type PizzaAdicionalDraft,
  type PizzaCategoriaDraft,
  type PizzaSaborPrecoDraft,
} from './pizzaDefaults'
import {
  PizzaComplementoNomeComDescricao,
  PizzaComplementoPrecoEditor,
} from './PizzaCategoriaAdicionaisTab'

type FilterTab = 'vinculados' | 'catalogo' | 'todos'

const EMPTY_COMPLEMENTOS: Complemento[] = []

interface PizzaCategoriaAdicionaisStepProps {
  draft: PizzaCategoriaDraft
  onChange: (draft: PizzaCategoriaDraft) => void
}

function precosDraftParaEditor(
  precosPorTamanhoLocalId: Record<string, PizzaSaborPrecoDraft>
): PrecoComplementoPizza[] {
  return Object.entries(precosPorTamanhoLocalId)
    .filter(([, cfg]) => cfg.enabled)
    .map(([pizzaTamanhoId, cfg]) => ({
      pizzaTamanhoId,
      valor: cfg.valor,
    }))
}

function precosEditorParaDraft(
  precos: PrecoComplementoPizza[]
): Record<string, PizzaSaborPrecoDraft> {
  return Object.fromEntries(
    precos.map(preco => [preco.pizzaTamanhoId, { enabled: true, valor: preco.valor }])
  )
}

export function PizzaCategoriaAdicionaisStep({
  draft,
  onChange,
}: PizzaCategoriaAdicionaisStepProps) {
  const tamanhosDisponiveis = useMemo(
    () =>
      draft.tamanhos
        .filter(t => t.nome.trim() && t.ativo)
        .map(t => ({ id: t.localId, nome: t.nome.trim() })),
    [draft.tamanhos]
  )

  const cadastroQuery = useComplementos({ limit: 2000 })
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTab, setFilterTab] = useState<FilterTab>('vinculados')
  const [pendentesComplementoIds, setPendentesComplementoIds] = useState<string[]>([])

  const catalogo = cadastroQuery.data ?? EMPTY_COMPLEMENTOS
  const idsVinculados = useMemo(
    () => new Set(draft.adicionais.map(item => item.complementoId)),
    [draft.adicionais]
  )
  const idsPendentes = useMemo(
    () => new Set(pendentesComplementoIds),
    [pendentesComplementoIds]
  )
  const idsSelecionados = useMemo(() => {
    const set = new Set(idsVinculados)
    for (const id of pendentesComplementoIds) set.add(id)
    return set
  }, [idsVinculados, pendentesComplementoIds])
  const adicionaisByComplementoId = useMemo(() => {
    const map = new Map<string, PizzaAdicionalDraft>()
    for (const item of draft.adicionais) {
      map.set(item.complementoId, item)
    }
    return map
  }, [draft.adicionais])

  const complementosPendentes = useMemo(
    () =>
      pendentesComplementoIds
        .map(id => catalogo.find(item => item.getId() === id) ?? null)
        .filter((item): item is Complemento => item != null),
    [catalogo, pendentesComplementoIds]
  )

  const filterCounts = useMemo(() => {
    let vinculados = 0
    let catalogoAtivos = 0
    for (const item of catalogo) {
      const id = item.getId()
      const selecionado = idsSelecionados.has(id)
      if (selecionado && item.isAtivo()) vinculados += 1
      if (!selecionado && item.isAtivo()) catalogoAtivos += 1
    }
    return {
      vinculados,
      catalogo: catalogoAtivos,
      todos: catalogo.length,
    }
  }, [catalogo, idsSelecionados])

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
      return bySearch.filter(item => !idsSelecionados.has(item.getId()) && item.isAtivo())
    }

    const vinculados: Complemento[] = []
    const naoVinculados: Complemento[] = []
    for (const item of bySearch) {
      if (idsSelecionados.has(item.getId())) vinculados.push(item)
      else naoVinculados.push(item)
    }
    return [...vinculados, ...naoVinculados]
  }, [catalogo, searchTerm, filterTab, idsVinculados, idsSelecionados])

  const iniciarVinculo = (complementoId: string) => {
    if (tamanhosDisponiveis.length === 0) {
      showToast.error('Configure ao menos um tamanho ativo antes de vincular adicionais')
      return
    }
    if (idsSelecionados.has(complementoId)) return
    setPendentesComplementoIds(prev =>
      prev.includes(complementoId) ? prev : [...prev, complementoId]
    )
  }

  const cancelarPendente = (complementoId: string) => {
    setPendentesComplementoIds(prev => prev.filter(id => id !== complementoId))
  }

  const removerAdicional = (complementoId: string) => {
    onChange({
      ...draft,
      adicionais: draft.adicionais.filter(item => item.complementoId !== complementoId),
    })
  }

  const handleToggleVinculo = (complementoId: string, checked: boolean) => {
    if (checked) {
      iniciarVinculo(complementoId)
      return
    }

    if (idsPendentes.has(complementoId)) {
      cancelarPendente(complementoId)
      return
    }

    if (!adicionaisByComplementoId.has(complementoId)) return
    if (!window.confirm('Remover este adicional da categoria?')) return
    removerAdicional(complementoId)
  }

  const confirmarPendente = (complemento: Complemento, precos: PrecoComplementoPizza[]) => {
    onChange({
      ...draft,
      adicionais: [
        ...draft.adicionais,
        {
          localId: createLocalId(),
          complementoId: complemento.getId(),
          ativo: true,
          precosPorTamanhoLocalId: precosEditorParaDraft(precos),
        },
      ],
    })
    cancelarPendente(complemento.getId())
    showToast.success('Adicional incluído (será salvo com a categoria)')
  }

  const atualizarPrecosAdicional = (
    adicional: PizzaAdicionalDraft,
    precos: PrecoComplementoPizza[]
  ) => {
    onChange({
      ...draft,
      adicionais: draft.adicionais.map(item =>
        item.localId === adicional.localId
          ? { ...item, precosPorTamanhoLocalId: precosEditorParaDraft(precos) }
          : item
      ),
    })
    showToast.success('Preços atualizados no rascunho')
  }

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
          Selecione em Disponíveis e depois vá em Nesta categoria para definir o preço por
          tamanho. Tudo será salvo junto com a categoria no final.
        </p>
      </header>

      {tamanhosDisponiveis.length === 0 ? (
        <div className="mb-3 shrink-0 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Configure ao menos um tamanho ativo no passo Tamanhos antes de configurar os adicionais.
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
        {cadastroQuery.isLoading ? (
          <div className="flex justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : null}

        {!cadastroQuery.isLoading && cadastroQuery.isError ? (
          <p className="py-6 text-center text-sm text-error">
            {cadastroQuery.error instanceof Error
              ? cadastroQuery.error.message
              : 'Erro ao carregar complementos'}
          </p>
        ) : null}

        {!cadastroQuery.isLoading && !cadastroQuery.isError ? (
          <>
            {filterTab === 'vinculados' ? (
              <div className="space-y-3">
                {complementosPendentes.map(complemento => {
                  const tipo = normalizarTipoImpactoPreco(complemento.getTipoImpactoPreco())
                  return (
                    <article
                      key={`pendente-${complemento.getId()}`}
                      className="space-y-4 rounded-xl border border-primary/40 bg-primary/5 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                            Novo vínculo — defina os preços por tamanho
                          </p>
                          <div className="mt-1">
                            <PizzaComplementoNomeComDescricao
                              nome={complemento.getNome()}
                              descricao={complemento.getDescricao()}
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => cancelarPendente(complemento.getId())}
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-secondary-text hover:bg-white"
                        >
                          Cancelar
                        </button>
                      </div>
                      <PizzaComplementoPrecoEditor
                        key={`pendente-editor-${complemento.getId()}`}
                        tamanhos={tamanhosDisponiveis}
                        precos={[]}
                        tipoImpactoPreco={tipo}
                        valorInicial={tipo === 'nenhum' ? 0 : complemento.getValor()}
                        iniciarTodosSelecionados
                        pending={false}
                        saveLabel="Confirmar adicional"
                        onSave={precos => confirmarPendente(complemento, precos)}
                      />
                    </article>
                  )
                })}

                {listaFiltrada.length === 0 && complementosPendentes.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-sm text-secondary-text">
                    Nenhum adicional nesta categoria. Selecione em Disponíveis para vincular.
                  </p>
                ) : null}

                {listaFiltrada.map(item => {
                  const adicional = adicionaisByComplementoId.get(item.getId())
                  if (!adicional) return null
                  const tipo = normalizarTipoImpactoPreco(item.getTipoImpactoPreco())
                  return (
                    <article
                      key={adicional.localId}
                      className="space-y-4 rounded-xl border border-gray-200 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <PizzaComplementoNomeComDescricao
                          nome={item.getNome()}
                          descricao={item.getDescricao()}
                        />
                        <div className="flex items-center gap-3">
                          <JiffyIconSwitch
                            checked={adicional.ativo}
                            onChange={event => {
                              event.stopPropagation()
                              onChange({
                                ...draft,
                                adicionais: draft.adicionais.map(row =>
                                  row.localId === adicional.localId
                                    ? { ...row, ativo: event.target.checked }
                                    : row
                                ),
                              })
                            }}
                            bordered={false}
                            size="sm"
                            inputProps={{ 'aria-label': 'Status do adicional' }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                !window.confirm(
                                  `Remover "${item.getNome()}" desta categoria?`
                                )
                              ) {
                                return
                              }
                              removerAdicional(item.getId())
                            }}
                            className="rounded-lg border border-error px-3 py-1.5 text-sm font-medium text-error"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                      <PizzaComplementoPrecoEditor
                        key={adicional.localId}
                        tamanhos={tamanhosDisponiveis}
                        precos={precosDraftParaEditor(adicional.precosPorTamanhoLocalId)}
                        tipoImpactoPreco={tipo}
                        pending={false}
                        saveLabel="Atualizar preços"
                        onSave={precos => atualizarPrecosAdicional(adicional, precos)}
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
                      style={{ gridTemplateColumns: 'minmax(0,1fr) 3.25rem' }}
                    >
                      <span className="text-xs font-semibold text-secondary-text">Complemento</span>
                      <span className="text-center text-xs font-semibold text-secondary-text">
                        Vínculo
                      </span>
                    </div>
                    {listaFiltrada.map(item => {
                      const id = item.getId()
                      const isLinked = idsVinculados.has(id)
                      const isPendente = idsPendentes.has(id)
                      const isSelecionado = isLinked || isPendente
                      const descricao = item.getDescricao()?.trim()
                      return (
                        <div
                          key={id}
                          className={`border-b border-gray-100 px-2 py-2 transition-colors hover:bg-primary-bg/40 ${
                            isSelecionado ? '' : 'opacity-80'
                          }`}
                        >
                          <div
                            className="hidden items-center gap-3 sm:grid"
                            style={{ gridTemplateColumns: 'minmax(0,1fr) 3.25rem' }}
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
                            <div className="flex justify-center">
                              <JiffyIconSwitch
                                checked={isSelecionado}
                                onChange={event => {
                                  event.stopPropagation()
                                  handleToggleVinculo(id, event.target.checked)
                                }}
                                disabled={!isSelecionado && !item.isAtivo()}
                                bordered={false}
                                size="sm"
                                inputProps={{
                                  'aria-label': isSelecionado ? 'Remover' : 'Vincular',
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
                              {isPendente ? (
                                <p className="text-xs font-medium text-primary">
                                  Aguardando preços em Nesta categoria
                                </p>
                              ) : null}
                            </div>
                            <JiffyIconSwitch
                              checked={isSelecionado}
                              onChange={event => {
                                event.stopPropagation()
                                handleToggleVinculo(id, event.target.checked)
                              }}
                              disabled={!isSelecionado && !item.isAtivo()}
                              bordered={false}
                              size="sm"
                              inputProps={{
                                'aria-label': isSelecionado ? 'Remover' : 'Vincular',
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
