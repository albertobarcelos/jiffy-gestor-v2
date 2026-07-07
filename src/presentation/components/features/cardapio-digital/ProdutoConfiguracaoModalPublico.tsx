'use client'

import { useMemo, useState } from 'react'
import type {
  CatalogoPublicoComplementoDTO,
  CatalogoPublicoGrupoComplementoDTO,
  CatalogoPublicoProdutoDTO,
} from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { normalizeTipoImpactoPreco } from '@/src/application/mappers/VendaApiNormalizer'
import {
  calcularTotalComplementos,
  formatarValorComplemento,
} from '@/src/domain/services/pedido/CalculadoraPedido'
import {
  useEnsureComplementosCatalogo,
  usePublicDeliveryComplementosStore,
} from '@/src/presentation/hooks/usePublicDeliveryCatalog'
import {
  useCardapioCarrinhoStore,
  type CarrinhoComplementoPublico,
} from '@/src/presentation/stores/cardapioCarrinhoStore'
import { showToast } from '@/src/shared/utils/toast'
import { MdClose, MdAdd, MdRemove } from 'react-icons/md'

type GrupoComplementoResolvido = CatalogoPublicoGrupoComplementoDTO & {
  complementos: CatalogoPublicoComplementoDTO[]
}

interface ProdutoConfiguracaoModalPublicoProps {
  slug: string
  produto: CatalogoPublicoProdutoDTO
  onClose: () => void
  onAdicionado: () => void
}

function resolveGruposComplementos(
  cache: { gruposComplementos: CatalogoPublicoGrupoComplementoDTO[]; complementos: CatalogoPublicoComplementoDTO[] } | null,
  produto: CatalogoPublicoProdutoDTO
): GrupoComplementoResolvido[] {
  if (!cache || !produto.abreComplementos) return []

  const complementoMap = new Map(cache.complementos.map(c => [c.id, c]))

  return produto.grupoComplementosIds
    .map(grupoId => cache.gruposComplementos.find(g => g.id === grupoId))
    .filter((g): g is CatalogoPublicoGrupoComplementoDTO => !!g)
    .map(grupo => ({
      ...grupo,
      complementos: grupo.complementoIds
        .map(id => complementoMap.get(id))
        .filter((c): c is CatalogoPublicoComplementoDTO => !!c),
    }))
    .filter(g => g.complementos.length > 0)
    .sort((a, b) => a.ordem - b.ordem)
}

function chaveComplemento(grupoId: string, complementoId: string) {
  return `${grupoId}-${complementoId}`
}

function somarQuantidadeNoGrupo(
  quantidades: Record<string, number>,
  grupoId: string,
  override?: { key: string; quantidade: number }
): number {
  let total = 0
  const prefix = `${grupoId}-`
  for (const [key, qtd] of Object.entries(quantidades)) {
    if (!key.startsWith(prefix)) continue
    total += override?.key === key ? override.quantidade : Math.max(0, Math.floor(qtd))
  }
  return total
}

export default function ProdutoConfiguracaoModalPublico({
  slug,
  produto,
  onClose,
  onAdicionado,
}: ProdutoConfiguracaoModalPublicoProps) {
  const adicionarItem = useCardapioCarrinhoStore(s => s.adicionarItem)
  const cacheComplementos = usePublicDeliveryComplementosStore(s => s.porSlug[slug] ?? null)
  const precisaComplementos = produto.abreComplementos && produto.grupoComplementosIds.length > 0
  const { isLoading: carregandoComplementos } = useEnsureComplementosCatalogo(
    slug,
    precisaComplementos && !cacheComplementos
  )

  const [quantidade, setQuantidade] = useState(1)
  const [observacao, setObservacao] = useState('')
  const [adicionando, setAdicionando] = useState(false)
  const [quantidadesComplementos, setQuantidadesComplementos] = useState<Record<string, number>>({})

  const grupos = useMemo(
    () => resolveGruposComplementos(cacheComplementos, produto),
    [cacheComplementos, produto]
  )

  const formatarPreco = (valor: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)

  const complementosSelecionados: CarrinhoComplementoPublico[] = useMemo(() => {
    return grupos.flatMap(grupo =>
      grupo.complementos.flatMap(comp => {
        const key = chaveComplemento(grupo.id, comp.id)
        const qtd = Math.max(0, Math.floor(quantidadesComplementos[key] ?? 0))
        if (qtd < 1) return []
        return [{
          complementoId: comp.id,
          grupoComplementoId: grupo.id,
          quantidade: qtd,
          nome: comp.nome,
          valor: comp.valor,
          tipoImpactoPreco: normalizeTipoImpactoPreco(comp.tipoImpactoPreco),
        }]
      })
    )
  }, [quantidadesComplementos, grupos])

  const valorComplementosUnitario = useMemo(() => {
    if (complementosSelecionados.length === 0) return 0
    return calcularTotalComplementos({
      produtoId: produto.id,
      nome: produto.nome,
      quantidade: 1,
      valorUnitario: produto.valor,
      complementos: complementosSelecionados.map(c => ({
        id: c.complementoId,
        grupoId: c.grupoComplementoId,
        nome: c.nome,
        valor: c.valor,
        quantidade: c.quantidade,
        tipoImpactoPreco: normalizeTipoImpactoPreco(c.tipoImpactoPreco),
      })),
    })
  }, [complementosSelecionados, produto.id, produto.nome, produto.valor])

  const valorUnitario = produto.valor + valorComplementosUnitario
  const valorTotal = valorUnitario * quantidade

  const ajustarQuantidadeComplemento = (
    grupo: GrupoComplementoResolvido,
    complementoId: string,
    delta: number
  ) => {
    const key = chaveComplemento(grupo.id, complementoId)
    setQuantidadesComplementos(prev => {
      const atual = Math.max(0, Math.floor(prev[key] ?? 0))
      const nova = Math.max(0, atual + delta)

      if (delta > 0 && grupo.qtdMaxima > 0) {
        const totalNoGrupo = somarQuantidadeNoGrupo(prev, grupo.id, { key, quantidade: nova })
        if (totalNoGrupo > grupo.qtdMaxima) {
          showToast.error(`Máximo de ${grupo.qtdMaxima} opção(ões) em ${grupo.nome}`)
          return prev
        }
      }

      if (nova === 0) {
        const next = { ...prev }
        delete next[key]
        return next
      }

      return { ...prev, [key]: nova }
    })
  }

  const validarGrupos = (): boolean => {
    for (const grupo of grupos) {
      const qtd = somarQuantidadeNoGrupo(quantidadesComplementos, grupo.id)
      const minimo = grupo.obrigatorio ? Math.max(grupo.qtdMinima, 1) : grupo.qtdMinima
      if (minimo > 0 && qtd < minimo) {
        showToast.error(`Selecione pelo menos ${minimo} em "${grupo.nome}"`)
        return false
      }
    }
    return true
  }

  const handleAdicionar = () => {
    if (precisaComplementos && !cacheComplementos) {
      showToast.error('Aguarde o carregamento das opções do produto')
      return
    }
    if (grupos.length > 0 && !validarGrupos()) return

    setAdicionando(true)
    try {
      const observacoes =
        observacao.trim().length >= 3 ? [observacao.trim()] : []

      adicionarItem(slug, {
        produtoId: produto.id,
        produtoNome: produto.nome,
        produtoImagemUrl: produto.imagemUrl,
        quantidade,
        valorUnitario,
        valorTotal,
        observacoes,
        complementos: complementosSelecionados,
      })
      showToast.success('Produto adicionado ao carrinho!')
      onAdicionado()
      onClose()
    } finally {
      setAdicionando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div
        className="relative w-full sm:max-w-lg max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-xl p-4 sm:p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        style={{ backgroundColor: 'var(--cardapio-bg-secondary)' }}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2
              className="text-xl font-bold"
              style={{ color: 'var(--cardapio-text-primary)' }}
            >
              {produto.nome}
            </h2>
            <p
              className="text-lg font-semibold mt-1"
              style={{ color: 'var(--cardapio-accent-primary)' }}
            >
              {formatarPreco(produto.valor)}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar">
            <MdClose className="w-6 h-6" style={{ color: 'var(--cardapio-text-secondary)' }} />
          </button>
        </div>

        {produto.descricao && (
          <p className="text-sm mb-4" style={{ color: 'var(--cardapio-text-secondary)' }}>
            {produto.descricao}
          </p>
        )}

        {grupos.length > 0 && (
          <div
            className="mb-4 rounded-lg border p-3"
            style={{
              borderColor: 'var(--cardapio-card-border)',
              backgroundColor: 'var(--cardapio-card-bg)',
            }}
          >
            <p
              className="font-semibold mb-3"
              style={{ color: 'var(--cardapio-card-text)' }}
            >
              Complementos
            </p>
            <div className="space-y-3">
              {grupos.map(grupo => (
                <div
                  key={grupo.id}
                  className="rounded-md border px-2 py-1.5"
                  style={{ borderColor: 'var(--cardapio-card-border)' }}
                >
                  <p
                    className="mb-1.5 text-sm font-semibold uppercase tracking-wide"
                    style={{ color: 'var(--cardapio-card-text)' }}
                  >
                    {grupo.nome}
                    {grupo.obrigatorio && <span className="text-red-500 ml-1">*</span>}
                  </p>
                  <div className="space-y-1">
                    {grupo.complementos.map(comp => {
                      const key = chaveComplemento(grupo.id, comp.id)
                      const qtdComp = Math.max(0, Math.floor(quantidadesComplementos[key] ?? 0))
                      const tipoIp = normalizeTipoImpactoPreco(comp.tipoImpactoPreco)

                      return (
                        <div
                          key={comp.id}
                          className="flex items-center justify-between gap-2 rounded px-2 py-1.5"
                          style={{ backgroundColor: 'var(--cardapio-card-hover)' }}
                        >
                          <span
                            className="min-w-0 flex-1 truncate text-sm font-medium"
                            style={{ color: 'var(--cardapio-card-text)' }}
                            title={comp.nome}
                          >
                            {comp.nome}
                          </span>
                          <span
                            className="shrink-0 text-sm font-semibold tabular-nums"
                            style={{ color: 'var(--cardapio-accent-primary)' }}
                          >
                            {formatarValorComplemento(comp.valor, tipoIp)}
                          </span>
                          <div
                            className="flex shrink-0 items-center rounded border overflow-hidden"
                            style={{
                              borderColor: 'var(--cardapio-card-border)',
                              backgroundColor: '#FFFFFF',
                            }}
                          >
                            <button
                              type="button"
                              aria-label={`Diminuir quantidade de ${comp.nome}`}
                              disabled={qtdComp <= 0}
                              onClick={() => ajustarQuantidadeComplemento(grupo, comp.id, -1)}
                              className="flex h-8 w-8 items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                              style={{
                                backgroundColor: 'var(--cardapio-brand)',
                                color: '#FFFFFF',
                              }}
                            >
                              <MdRemove className="h-4 w-4" />
                            </button>
                            <span
                              className="min-w-[1.75rem] px-1 text-center text-sm font-medium tabular-nums bg-white"
                              style={{ color: 'var(--cardapio-card-text)' }}
                              aria-label="Quantidade do complemento"
                            >
                              {qtdComp}
                            </span>
                            <button
                              type="button"
                              aria-label={`Aumentar quantidade de ${comp.nome}`}
                              onClick={() => ajustarQuantidadeComplemento(grupo, comp.id, 1)}
                              className="flex h-8 w-8 items-center justify-center transition-colors"
                              style={{
                                backgroundColor: 'var(--cardapio-brand)',
                                color: '#FFFFFF',
                              }}
                            >
                              <MdAdd className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            <p
              className="mt-3 text-sm font-medium text-right"
              style={{ color: 'var(--cardapio-card-text-secondary)' }}
            >
              Total dos complementos:{' '}
              <span style={{ color: 'var(--cardapio-accent-primary)' }}>
                {formatarPreco(valorComplementosUnitario)}
              </span>
            </p>
          </div>
        )}

        {precisaComplementos && carregandoComplementos && !cacheComplementos && (
          <p className="text-sm mb-4" style={{ color: 'var(--cardapio-text-secondary)' }}>
            Carregando opções...
          </p>
        )}

        <div className="mb-4">
          <label
            className="block text-sm font-medium mb-1"
            style={{ color: 'var(--cardapio-text-secondary)' }}
          >
            Observação (opcional)
          </label>
          <textarea
            value={observacao}
            onChange={e => setObservacao(e.target.value)}
            rows={2}
            maxLength={100}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{
              borderColor: 'var(--cardapio-border)',
              backgroundColor: 'var(--cardapio-bg-primary)',
              color: 'var(--cardapio-text-primary)',
            }}
            placeholder="Ex.: sem cebola"
          />
        </div>

        <div className="flex items-center justify-between mb-4">
          <span style={{ color: 'var(--cardapio-text-secondary)' }}>Quantidade</span>
          <div
            className="flex items-center rounded-lg border overflow-hidden"
            style={{ borderColor: 'var(--cardapio-border)' }}
          >
            <button
              type="button"
              onClick={() => setQuantidade(q => Math.max(1, q - 1))}
              className="flex h-9 w-9 items-center justify-center"
              style={{
                backgroundColor: 'var(--cardapio-brand)',
                color: '#FFFFFF',
              }}
              aria-label="Diminuir quantidade do produto"
            >
              <MdRemove className="h-4 w-4" />
            </button>
            <span
              className="min-w-[2rem] px-2 text-center font-bold tabular-nums bg-white"
              style={{ color: 'var(--cardapio-card-text)' }}
            >
              {quantidade}
            </span>
            <button
              type="button"
              onClick={() => setQuantidade(q => q + 1)}
              className="flex h-9 w-9 items-center justify-center"
              style={{
                backgroundColor: 'var(--cardapio-brand)',
                color: '#FFFFFF',
              }}
              aria-label="Aumentar quantidade do produto"
            >
              <MdAdd className="h-4 w-4" />
            </button>
          </div>
        </div>

        <button
          type="button"
          disabled={adicionando || (precisaComplementos && carregandoComplementos && !cacheComplementos)}
          onClick={handleAdicionar}
          className="w-full py-3 rounded-xl font-semibold disabled:opacity-60"
          style={{
            backgroundColor: 'var(--cardapio-btn-primary)',
            color: 'var(--cardapio-btn-primary-text)',
          }}
        >
          {adicionando ? 'Adicionando...' : `Adicionar · ${formatarPreco(valorTotal)}`}
        </button>
      </div>
    </div>
  )
}
