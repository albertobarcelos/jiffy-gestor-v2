'use client'

import { useEffect, useMemo, useState } from 'react'
import { MdAdd, MdClose, MdRemove } from 'react-icons/md'
import type { Produto } from '@/src/domain/entities/Produto'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import {
  fetchHidratacaoGruposComplementosCatalogo,
  fetchProdutoCatalogoPorId,
} from '@/src/presentation/components/features/pedidos/novoPedidoProdutosApi'
import { adicionarItemCarrinho } from '@/src/infrastructure/api/cardapio-mesa/cardapioMesaApiService'
import { showToast } from '@/src/shared/utils/toast'
import { lerMesaQrSession } from './mesaQrSession'

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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{produto.getNome()}</h2>
            <p className="text-orange-600 font-semibold">{formatarPreco(produto.getValor())}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-gray-100" aria-label="Fechar">
            <MdClose className="h-6 w-6" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-orange-500" />
          </div>
        ) : (
          <>
            {grupos.length > 0 ? (
              <div className="mb-4 space-y-4">
                {grupos.map(grupo => (
                  <div key={grupo.id}>
                    <p className="mb-2 text-sm font-semibold text-gray-800">
                      {grupo.nome}
                      {grupo.qtdMinima > 0 ? (
                        <span className="ml-1 font-normal text-gray-500">(mín. {grupo.qtdMinima})</span>
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
                              className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm ${
                                on ? 'border-orange-500 bg-orange-50' : 'border-gray-200'
                              }`}
                            >
                              <span>{comp.nome}</span>
                              <span className="text-gray-600">
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

            <label className="mb-1 block text-sm font-semibold text-gray-700">Observações</label>
            <textarea
              value={obs}
              onChange={e => setObs(e.target.value)}
              rows={2}
              className="mb-4 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              placeholder="Ex.: sem cebola"
            />

            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="rounded-full border p-2"
                  onClick={() => setQuantidade(q => Math.max(1, q - 1))}
                >
                  <MdRemove />
                </button>
                <span className="w-8 text-center font-bold">{quantidade}</span>
                <button
                  type="button"
                  className="rounded-full border p-2"
                  onClick={() => setQuantidade(q => q + 1)}
                >
                  <MdAdd />
                </button>
              </div>
              <p className="text-lg font-bold text-gray-900">{formatarPreco(total)}</p>
            </div>

            <button
              type="button"
              disabled={enviando}
              onClick={handleAdd}
              className="w-full rounded-xl bg-orange-500 py-3 font-semibold text-white disabled:opacity-60"
            >
              {enviando ? 'Adicionando...' : 'Adicionar ao carrinho'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
