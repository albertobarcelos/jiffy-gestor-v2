'use client'

import { useEffect, useMemo, useState } from 'react'
import { MdAdd, MdRemove } from 'react-icons/md'
import type { Produto } from '@/src/domain/entities/Produto'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import {
  fetchHidratacaoGruposComplementosCatalogo,
  fetchProdutoCatalogoPorId,
} from '@/src/presentation/components/features/pedidos/novoPedidoProdutosApi'
import { adicionarItemCarrinho } from '@/src/infrastructure/api/cardapio-mesa/cardapioMesaApiService'
import { showToast } from '@/src/shared/utils/toast'
import { lerMesaQrSession } from './mesaQrSession'
import CardapioMesaSidePanel from './CardapioMesaSidePanel'

type Props = {
  mesaId: string
  menuId: string
  produto: Produto
  onClose: () => void
  onAdded: () => void
}

type CompSel = { id: string; nome: string; valor: number; quantidade: number }

function formatarPreco(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}

export default function ProdutoMesaAddModal({
  mesaId,
  menuId,
  produto: produtoInicial,
  onClose,
  onAdded,
}: Props) {
  const token = useAuthStore(s => s.tenantAuth?.getAccessToken())
  const [produto, setProduto] = useState(produtoInicial)
  const [loading, setLoading] = useState(true)
  const [quantidade, setQuantidade] = useState(1)
  const [obs, setObs] = useState('')
  const [selecionados, setSelecionados] = useState<Record<string, CompSel>>({})
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!token) {
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const carregado = await fetchProdutoCatalogoPorId(
          produtoInicial.getId(),
          token,
          menuId
        )
        if (!carregado) {
          if (!cancelled) setProduto(produtoInicial)
          return
        }
        const hidratado = await fetchHidratacaoGruposComplementosCatalogo(carregado, token)
        if (!cancelled) setProduto(hidratado)
      } catch {
        if (!cancelled) showToast.error('Não foi possível carregar complementos')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [produtoInicial, menuId, token])

  const grupos = produto.getGruposComplementos?.() ?? []

  const extraComplementos = useMemo(
    () => Object.values(selecionados).reduce((s, c) => s + c.valor * c.quantidade, 0),
    [selecionados]
  )

  const unitario = produto.getValor() + extraComplementos
  const total = unitario * quantidade

  const toggleComp = (grupoId: string, comp: { id: string; nome: string; valor?: number }) => {
    setSelecionados(prev => {
      const key = `${grupoId}:${comp.id}`
      if (prev[key]) {
        const next = { ...prev }
        delete next[key]
        return next
      }
      return {
        ...prev,
        [key]: {
          id: comp.id,
          nome: comp.nome,
          valor: comp.valor ?? 0,
          quantidade: 1,
        },
      }
    })
  }

  const handleAdd = async () => {
    setEnviando(true)
    try {
      const sessionId = lerMesaQrSession()?.sessionToken || mesaId
      await adicionarItemCarrinho(sessionId, {
        produtoId: produto.getId(),
        produtoNome: produto.getNome(),
        produtoImagemUrl: produto.getImagemUrl() || undefined,
        quantidade,
        valorUnitario: unitario,
        valorTotal: total,
        complementos: Object.values(selecionados),
        observacoes: obs || undefined,
      })
      showToast.success('Adicionado ao carrinho')
      onAdded()
    } catch {
      showToast.error('Erro ao adicionar')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <CardapioMesaSidePanel
      open
      onClose={onClose}
      title={produto.getNome()}
      ariaLabel="Detalhes do produto"
      footer={
        loading ? null : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="rounded-full border p-2"
                  style={{
                    borderColor: 'var(--cardapio-border, #333)',
                    color: 'var(--cardapio-text-primary)',
                  }}
                  onClick={() => setQuantidade(q => Math.max(1, q - 1))}
                >
                  <MdRemove />
                </button>
                <span
                  className="w-8 text-center font-bold"
                  style={{ color: 'var(--cardapio-text-primary)' }}
                >
                  {quantidade}
                </span>
                <button
                  type="button"
                  className="rounded-full border p-2"
                  style={{
                    borderColor: 'var(--cardapio-border, #333)',
                    color: 'var(--cardapio-text-primary)',
                  }}
                  onClick={() => setQuantidade(q => q + 1)}
                >
                  <MdAdd />
                </button>
              </div>
              <p className="text-lg font-bold" style={{ color: 'var(--cardapio-text-primary)' }}>
                {formatarPreco(total)}
              </p>
            </div>
            <button
              type="button"
              disabled={enviando}
              onClick={handleAdd}
              className="w-full rounded-xl py-3 font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: 'var(--cardapio-accent-primary, #FF7A00)' }}
            >
              {enviando ? 'Adicionando...' : 'Adicionar ao carrinho'}
            </button>
          </div>
        )
      }
    >
      <div className="space-y-4 p-4">
        {produto.getImagemUrl() ? (
          <div
            className="aspect-[16/10] w-full overflow-hidden rounded-2xl"
            style={{ backgroundColor: 'var(--cardapio-bg-elevated, #333)' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={produto.getImagemUrl()!}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        ) : null}

        <p className="font-semibold text-orange-500">{formatarPreco(produto.getValor())}</p>

        {produto.getDescricao() ? (
          <p className="text-sm" style={{ color: 'var(--cardapio-text-secondary)' }}>
            {produto.getDescricao()}
          </p>
        ) : null}

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-orange-500" />
          </div>
        ) : (
          <>
            {grupos.length > 0 ? (
              <div className="space-y-4">
                {grupos.map(grupo => (
                  <div key={grupo.id}>
                    <p
                      className="mb-2 text-sm font-semibold"
                      style={{ color: 'var(--cardapio-text-primary)' }}
                    >
                      {grupo.nome}
                      {grupo.qtdMinima > 0 ? (
                        <span
                          className="ml-1 font-normal"
                          style={{ color: 'var(--cardapio-text-secondary)' }}
                        >
                          (mín. {grupo.qtdMinima})
                        </span>
                      ) : null}
                    </p>
                    <div className="space-y-2">
                      {grupo.complementos
                        .filter(c => c.ativo !== false)
                        .map(comp => {
                          const key = `${grupo.id}:${comp.id}`
                          const on = Boolean(selecionados[key])
                          return (
                            <button
                              key={comp.id}
                              type="button"
                              onClick={() =>
                                toggleComp(grupo.id, {
                                  id: comp.id,
                                  nome: comp.nome,
                                  valor: comp.valor,
                                })
                              }
                              className="flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm"
                              style={{
                                borderColor: on
                                  ? 'var(--cardapio-accent-primary, #FF7A00)'
                                  : 'var(--cardapio-border, #333)',
                                backgroundColor: on
                                  ? 'rgba(255, 122, 0, 0.12)'
                                  : 'var(--cardapio-bg-elevated, transparent)',
                                color: 'var(--cardapio-text-primary)',
                              }}
                            >
                              <span>{comp.nome}</span>
                              <span style={{ color: 'var(--cardapio-text-secondary)' }}>
                                {comp.valor ? `+ ${formatarPreco(comp.valor)}` : 'Grátis'}
                              </span>
                            </button>
                          )
                        })}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            <div>
              <label
                className="mb-1 block text-sm font-semibold"
                style={{ color: 'var(--cardapio-text-primary)' }}
              >
                Observações
              </label>
              <textarea
                value={obs}
                onChange={e => setObs(e.target.value)}
                rows={2}
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                style={{
                  borderColor: 'var(--cardapio-border, #333)',
                  backgroundColor: 'var(--cardapio-bg-elevated, transparent)',
                  color: 'var(--cardapio-text-primary)',
                }}
                placeholder="Ex.: sem cebola"
              />
            </div>
          </>
        )}
      </div>
    </CardapioMesaSidePanel>
  )
}
