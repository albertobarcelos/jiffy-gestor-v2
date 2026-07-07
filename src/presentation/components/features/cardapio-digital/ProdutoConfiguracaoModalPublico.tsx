'use client'

import { useMemo, useState } from 'react'
import type {
  CatalogoPublicoComplementoDTO,
  CatalogoPublicoGrupoComplementoDTO,
  CatalogoPublicoProdutoDTO,
} from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
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
  const [selecionados, setSelecionados] = useState<
    Record<string, { complementoId: string; grupoComplementoId: string; quantidade: number }>
  >({})

  const grupos = useMemo(
    () => resolveGruposComplementos(cacheComplementos, produto),
    [cacheComplementos, produto]
  )

  const formatarPreco = (valor: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)

  const complementosSelecionados: CarrinhoComplementoPublico[] = useMemo(() => {
    if (!cacheComplementos) return []
    const map = new Map(cacheComplementos.complementos.map(c => [c.id, c]))
    return Object.values(selecionados).flatMap(sel => {
      const comp = map.get(sel.complementoId)
      if (!comp) return []
      return [{
        complementoId: sel.complementoId,
        grupoComplementoId: sel.grupoComplementoId,
        quantidade: sel.quantidade,
        nome: comp.nome,
        valor: comp.valor,
        tipoImpactoPreco: comp.tipoImpactoPreco,
      }]
    })
  }, [selecionados, cacheComplementos])

  const valorComplementosUnitario = complementosSelecionados.reduce((acc, c) => {
    if (c.tipoImpactoPreco === 'aumenta') return acc + c.valor * c.quantidade
    return acc
  }, 0)

  const valorUnitario = produto.valor + valorComplementosUnitario
  const valorTotal = valorUnitario * quantidade

  const toggleComplemento = (
    grupo: GrupoComplementoResolvido,
    complementoId: string
  ) => {
    setSelecionados(prev => {
      const key = complementoId
      if (prev[key]) {
        const next = { ...prev }
        delete next[key]
        return next
      }
      const totalNoGrupo = Object.values(prev).filter(
        s => s.grupoComplementoId === grupo.id
      ).length
      if (grupo.qtdMaxima > 0 && totalNoGrupo >= grupo.qtdMaxima) {
        showToast.error(`Máximo de ${grupo.qtdMaxima} opção(ões) em ${grupo.nome}`)
        return prev
      }
      return {
        ...prev,
        [key]: { complementoId, grupoComplementoId: grupo.id, quantidade: 1 },
      }
    })
  }

  const validarGrupos = (): boolean => {
    for (const grupo of grupos) {
      const qtd = Object.values(selecionados).filter(
        s => s.grupoComplementoId === grupo.id
      ).length
      if (grupo.obrigatorio && qtd < Math.max(grupo.qtdMinima, 1)) {
        showToast.error(`Selecione opções em "${grupo.nome}"`)
        return false
      }
      if (grupo.qtdMinima > 0 && qtd < grupo.qtdMinima) {
        showToast.error(`Selecione pelo menos ${grupo.qtdMinima} em "${grupo.nome}"`)
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

        {precisaComplementos && carregandoComplementos && !cacheComplementos && (
          <p className="text-sm mb-4" style={{ color: 'var(--cardapio-text-secondary)' }}>
            Carregando opções...
          </p>
        )}

        {grupos.map(grupo => (
          <div key={grupo.id} className="mb-4">
            <p className="font-semibold mb-2" style={{ color: 'var(--cardapio-text-primary)' }}>
              {grupo.nome}
              {grupo.obrigatorio && <span className="text-red-500 ml-1">*</span>}
            </p>
            <div className="space-y-2">
              {grupo.complementos.map(comp => {
                const selected = !!selecionados[comp.id]
                return (
                  <button
                    key={comp.id}
                    type="button"
                    onClick={() => toggleComplemento(grupo, comp.id)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left"
                    style={{
                      borderColor: selected
                        ? 'var(--cardapio-accent-primary)'
                        : 'var(--cardapio-border)',
                      backgroundColor: selected
                        ? 'var(--cardapio-menu-item-active)'
                        : 'var(--cardapio-card-bg)',
                    }}
                  >
                    <span style={{ color: 'var(--cardapio-card-text)' }}>{comp.nome}</span>
                    {comp.valor > 0 && (
                      <span style={{ color: 'var(--cardapio-accent-primary)' }}>
                        + {formatarPreco(comp.valor)}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}

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
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQuantidade(q => Math.max(1, q - 1))}
              className="p-2 rounded-lg"
              style={{ backgroundColor: 'var(--cardapio-bg-elevated)' }}
            >
              <MdRemove />
            </button>
            <span className="font-bold w-6 text-center">{quantidade}</span>
            <button
              type="button"
              onClick={() => setQuantidade(q => q + 1)}
              className="p-2 rounded-lg"
              style={{ backgroundColor: 'var(--cardapio-bg-elevated)' }}
            >
              <MdAdd />
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
