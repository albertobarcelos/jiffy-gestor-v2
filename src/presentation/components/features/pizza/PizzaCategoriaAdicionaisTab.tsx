'use client'

import { useMemo, useState } from 'react'
import {
  Autocomplete,
  Checkbox,
  FormControlLabel,
  TextField,
} from '@mui/material'
import { Complemento } from '@/src/domain/entities/Complemento'
import { normalizarTipoImpactoPreco } from '@/src/domain/complemento/tipos'
import { useComplementos } from '@/src/presentation/hooks/useComplementos'
import {
  useAtualizarPrecosPizzaComplementoMutation,
  useDesvincularPizzaComplementoMutation,
  usePizzaComplementos,
  useVincularPizzaComplementoMutation,
} from '@/src/presentation/hooks/pizza/usePizza'
import { showToast } from '@/src/shared/utils/toast'
import type {
  ComplementoPizza,
  PrecoComplementoPizza,
  TipoImpactoPreco,
} from '@/src/shared/types/pizza'

interface PizzaComplementoTamanhoOption {
  id: string
  nome: string
}

interface PizzaCategoriaAdicionaisTabProps {
  categoriaId: string
  tamanhos: Array<{ id?: string; nome: string; ativo: boolean }>
}

interface PizzaComplementoPrecoEditorProps {
  tamanhos: PizzaComplementoTamanhoOption[]
  precos: PrecoComplementoPizza[]
  tipoImpactoPreco: TipoImpactoPreco
  valorInicial?: number
  iniciarTodosSelecionados?: boolean
  pending: boolean
  onSave: (precos: PrecoComplementoPizza[]) => Promise<void>
}

function nomeImpacto(tipoImpactoPreco: TipoImpactoPreco) {
  if (tipoImpactoPreco === 'aumenta') return 'Acréscimo'
  if (tipoImpactoPreco === 'diminui') return 'Desconto'
  return 'Sem impacto de preço'
}

function PizzaComplementoPrecoEditor({
  tamanhos,
  precos,
  tipoImpactoPreco,
  valorInicial,
  iniciarTodosSelecionados = false,
  pending,
  onSave,
}: PizzaComplementoPrecoEditorProps) {
  const [valores, setValores] = useState(() => {
    const existentes = new Map(precos.map(preco => [preco.pizzaTamanhoId, preco.valor]))
    return Object.fromEntries(
      tamanhos.map(tamanho => {
        const temPreco = existentes.has(tamanho.id)
        const valor =
          tipoImpactoPreco === 'nenhum'
            ? 0
            : existentes.get(tamanho.id) ?? valorInicial ?? 0
        return [
          tamanho.id,
          {
            ativo: temPreco || iniciarTodosSelecionados,
            valor: String(valor),
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
      const valorTexto = valores[tamanho.id].valor.trim()
      if (!valorTexto) {
        showToast.error(`Informe um preço para o tamanho ${tamanho.nome}`)
        return
      }
      const valor = Number(valorTexto.replace(',', '.'))
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
      <div className="grid gap-2 sm:grid-cols-2">
        {tamanhos.map(tamanho => {
          const valor = valores[tamanho.id]
          return (
            <div
              key={tamanho.id}
              className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2"
            >
              <FormControlLabel
                className="m-0 min-w-0 flex-1"
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
              <TextField
                type="number"
                size="small"
                label={
                  tipoImpactoPreco === 'aumenta'
                    ? 'Acréscimo'
                    : tipoImpactoPreco === 'diminui'
                      ? 'Desconto'
                      : 'Valor'
                }
                value={valor?.valor ?? ''}
                disabled={!valor?.ativo || tipoImpactoPreco === 'nenhum'}
                inputProps={{ min: 0, step: 0.01 }}
                onChange={event =>
                  setValores(current => ({
                    ...current,
                    [tamanho.id]: {
                      ...current[tamanho.id],
                      valor: event.target.value,
                    },
                  }))
                }
                sx={{ width: 125 }}
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
        {pending ? 'Salvando...' : 'Salvar preços'}
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
  const cadastroQuery = useComplementos({ ativo: true, limit: 2000 })
  const vincularMutation = useVincularPizzaComplementoMutation()
  const precosMutation = useAtualizarPrecosPizzaComplementoMutation()
  const desvincularMutation = useDesvincularPizzaComplementoMutation()
  const [complementoSelecionado, setComplementoSelecionado] =
    useState<Complemento | null>(null)

  const complementosVinculados = complementosQuery.data ?? []
  const idsVinculados = useMemo(
    () => new Set(complementosVinculados.map(complemento => complemento.complementoId)),
    [complementosVinculados]
  )
  const opcoes = useMemo(
    () =>
      (cadastroQuery.data ?? []).filter(
        complemento => complemento.isAtivo() && !idsVinculados.has(complemento.getId())
      ),
    [cadastroQuery.data, idsVinculados]
  )
  const tipoImpactoSelecionado = normalizarTipoImpactoPreco(
    complementoSelecionado?.getTipoImpactoPreco()
  )

  const handleVincular = async (precos: PrecoComplementoPizza[]) => {
    if (!complementoSelecionado) return
    try {
      await vincularMutation.mutateAsync({
        categoriaPizzaId: categoriaId,
        complementoId: complementoSelecionado.getId(),
        precos,
      })
      showToast.success('Adicional vinculado à categoria')
      setComplementoSelecionado(null)
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

  return (
    <section className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4 md:p-6">
      <header>
        <h2 className="text-lg font-semibold text-primary-text">Adicionais da pizza</h2>
        <p className="mt-1 text-sm text-secondary-text">
          Vincule complementos já cadastrados e defina o preço cobrado uma vez por pizza,
          conforme o tamanho. O cadastro global do complemento não será alterado.
        </p>
      </header>

      {tamanhosDisponiveis.length === 0 ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Salve ao menos um tamanho ativo da categoria antes de configurar os adicionais.
        </div>
      ) : null}

      <div className="space-y-3 rounded-xl border border-gray-200 p-4">
        <h3 className="font-medium text-primary-text">Vincular complemento existente</h3>
        {cadastroQuery.isError ? (
          <p className="text-sm text-error">
            {cadastroQuery.error instanceof Error
              ? cadastroQuery.error.message
              : 'Erro ao carregar complementos cadastrados'}
          </p>
        ) : null}
        <Autocomplete
          options={opcoes}
          value={complementoSelecionado}
          loading={cadastroQuery.isLoading}
          disabled={
            tamanhosDisponiveis.length === 0 ||
            cadastroQuery.isError ||
            vincularMutation.isPending
          }
          getOptionLabel={option => option.getNome()}
          isOptionEqualToValue={(option, value) => option.getId() === value.getId()}
          onChange={(_event, value) => setComplementoSelecionado(value)}
          noOptionsText="Nenhum complemento disponível para vincular"
          renderInput={params => (
            <TextField {...params} label="Complemento" placeholder="Buscar complemento" />
          )}
        />
        {complementoSelecionado ? (
          <div className="space-y-3 rounded-lg bg-gray-50 p-3">
            <p className="text-sm text-secondary-text">
              Impacto: <strong>{nomeImpacto(tipoImpactoSelecionado)}</strong>.
              {tipoImpactoSelecionado === 'nenhum'
                ? ' O valor será R$ 0,00; escolha os tamanhos em que o adicional gratuito ficará disponível.'
                : ' Os valores começam pelo valor-base cadastrado e podem ser ajustados por tamanho.'}
            </p>
            <PizzaComplementoPrecoEditor
              key={complementoSelecionado.getId()}
              tamanhos={tamanhosDisponiveis}
              precos={[]}
              tipoImpactoPreco={tipoImpactoSelecionado}
              valorInicial={tipoImpactoSelecionado === 'nenhum' ? 0 : complementoSelecionado.getValor()}
              iniciarTodosSelecionados
              pending={vincularMutation.isPending}
              onSave={handleVincular}
            />
          </div>
        ) : null}
      </div>

      <div className="space-y-3">
        <h3 className="font-medium text-primary-text">Adicionais vinculados</h3>
        {complementosQuery.isLoading ? (
          <p className="text-sm text-secondary-text">Carregando adicionais...</p>
        ) : null}
        {complementosQuery.isError ? (
          <p className="text-sm text-error">
            {complementosQuery.error instanceof Error
              ? complementosQuery.error.message
              : 'Erro ao carregar adicionais da pizza'}
          </p>
        ) : null}
        {!complementosQuery.isLoading &&
        !complementosQuery.isError &&
        complementosVinculados.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-secondary-text">
            Nenhum adicional vinculado a esta categoria.
          </p>
        ) : null}
        {complementosVinculados.map(complemento => (
          <article
            key={complemento.id}
            className="space-y-4 rounded-xl border border-gray-200 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h4 className="font-medium text-primary-text">{complemento.nome}</h4>
                <p className="mt-1 text-sm text-secondary-text">
                  Impacto: {nomeImpacto(complemento.tipoImpactoPreco)}
                </p>
                {complemento.descricao ? (
                  <p className="mt-1 text-sm text-secondary-text">{complemento.descricao}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => void handleDesvincular(complemento)}
                disabled={desvincularMutation.isPending}
                className="rounded-lg border border-error px-3 py-1.5 text-sm font-medium text-error disabled:opacity-50"
              >
                Desvincular
              </button>
            </div>
            <PizzaComplementoPrecoEditor
              key={`${complemento.id}-${complementosQuery.dataUpdatedAt}`}
              tamanhos={tamanhosDisponiveis}
              precos={complemento.precos}
              tipoImpactoPreco={complemento.tipoImpactoPreco}
              pending={precosMutation.isPending}
              onSave={precos => handleSalvarPrecos(complemento, precos)}
            />
          </article>
        ))}
      </div>
    </section>
  )
}
