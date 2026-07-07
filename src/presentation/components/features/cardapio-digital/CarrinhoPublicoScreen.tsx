'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MdArrowBack, MdDelete, MdAdd, MdRemove } from 'react-icons/md'
import {
  useCardapioCarrinhoStore,
  type CarrinhoItemPublico,
} from '@/src/presentation/stores/cardapioCarrinhoStore'
import {
  usePublicDeliveryMeiosPagamento,
} from '@/src/presentation/hooks/usePublicDeliveryCatalog'
import { criarPedidoPublico } from '@/src/infrastructure/api/publicDeliveryApi'
import type { CreatePedidoPublicoInput } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { showToast } from '@/src/shared/utils/toast'

interface CarrinhoPublicoScreenProps {
  slug: string
}

export default function CarrinhoPublicoScreen({ slug }: CarrinhoPublicoScreenProps) {
  const router = useRouter()
  const resumo = useCardapioCarrinhoStore(s => s.getResumo(slug))
  const atualizarQuantidade = useCardapioCarrinhoStore(s => s.atualizarQuantidade)
  const removerItem = useCardapioCarrinhoStore(s => s.removerItem)
  const limpar = useCardapioCarrinhoStore(s => s.limpar)

  const { data: meiosData, isLoading: loadingMeios } = usePublicDeliveryMeiosPagamento(slug)

  const [tipoEntrega, setTipoEntrega] = useState<'entrega' | 'retirada'>('retirada')
  const [telefone, setTelefone] = useState('')
  const [nome, setNome] = useState('')
  const [rua, setRua] = useState('')
  const [numero, setNumero] = useState('')
  const [bairro, setBairro] = useState('')
  const [cidade, setCidade] = useState('')
  const [meioPagamentoId, setMeioPagamentoId] = useState('')
  const [enviando, setEnviando] = useState(false)

  const formatarPreco = (valor: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)

  const montarPedido = (): CreatePedidoPublicoInput | null => {
    const tel = telefone.replace(/\D/g, '')
    if (tel.length < 10) {
      showToast.error('Informe um telefone válido')
      return null
    }
    if (resumo.itens.length === 0) {
      showToast.error('Carrinho vazio')
      return null
    }
    if (tipoEntrega === 'entrega' && (!rua.trim() || !numero.trim() || !bairro.trim())) {
      showToast.error('Preencha o endereço de entrega')
      return null
    }

    const produtos = resumo.itens.map(item => ({
      produtoId: item.produtoId,
      quantidade: item.quantidade,
      observacoes: item.observacoes,
      complementos: item.complementos.map(c => ({
        complementoId: c.complementoId,
        grupoComplementoId: c.grupoComplementoId,
        quantidade: c.quantidade,
      })),
    }))

    const cliente: CreatePedidoPublicoInput['cliente'] = {
      telefone: tel,
      nome: nome.trim() || null,
    }

    if (tipoEntrega === 'entrega') {
      cliente.enderecos = [
        {
          etiqueta: 'casa',
          rua: rua.trim(),
          numero: numero.trim(),
          bairro: bairro.trim(),
          cidade: cidade.trim() || null,
        },
      ]
    }

    const payload: CreatePedidoPublicoInput = {
      slug,
      origem: 'JIFFY_DELIVERY',
      tipoEntrega,
      cliente,
      produtos,
    }

    if (meioPagamentoId) {
      payload.cobrancas = [
        {
          meioPagamentoId,
          valor: resumo.total,
          momentoCobranca: 'na_entrega',
        },
      ]
    }

    return payload
  }

  const handleEnviarPedido = async () => {
    const payload = montarPedido()
    if (!payload) return
    if (!confirm('Confirmar envio do pedido?')) return

    setEnviando(true)
    try {
      await criarPedidoPublico(payload)
      limpar(slug)
      showToast.success('Pedido enviado com sucesso!')
      router.push(`/cardapio/${slug}`)
    } catch (error) {
      console.error(error)
      showToast.error(error instanceof Error ? error.message : 'Erro ao enviar pedido')
    } finally {
      setEnviando(false)
    }
  }

  const renderItem = (item: CarrinhoItemPublico) => (
    <div
      key={item.id}
      className="rounded-xl border p-4 flex gap-3"
      style={{
        borderColor: 'var(--cardapio-border)',
        backgroundColor: 'var(--cardapio-card-bg)',
      }}
    >
      <div className="flex-1 min-w-0">
        <p className="font-semibold" style={{ color: 'var(--cardapio-text-primary)' }}>
          {item.produtoNome}
        </p>
        {item.complementos.length > 0 && (
          <ul className="text-xs mt-1" style={{ color: 'var(--cardapio-text-secondary)' }}>
            {item.complementos.map(c => (
              <li key={`${c.complementoId}-${c.grupoComplementoId}`}>
                + {c.nome} {c.quantidade > 1 ? `(x${c.quantidade})` : ''}
              </li>
            ))}
          </ul>
        )}
        <p className="font-bold mt-2" style={{ color: 'var(--cardapio-accent-primary)' }}>
          {formatarPreco(item.valorTotal)}
        </p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              item.quantidade <= 1
                ? removerItem(slug, item.id)
                : atualizarQuantidade(slug, item.id, item.quantidade - 1)
            }
            className="p-1 rounded"
            style={{ backgroundColor: 'var(--cardapio-bg-elevated)' }}
          >
            <MdRemove />
          </button>
          <span className="w-6 text-center font-medium">{item.quantidade}</span>
          <button
            type="button"
            onClick={() => atualizarQuantidade(slug, item.id, item.quantidade + 1)}
            className="p-1 rounded"
            style={{ backgroundColor: 'var(--cardapio-bg-elevated)' }}
          >
            <MdAdd />
          </button>
        </div>
        <button
          type="button"
          onClick={() => removerItem(slug, item.id)}
          className="text-red-500 p-1"
          aria-label="Remover"
        >
          <MdDelete />
        </button>
      </div>
    </div>
  )

  const inputClass =
    'w-full rounded-lg border px-3 py-2 text-sm'
  const inputStyle = {
    borderColor: 'var(--cardapio-border)',
    backgroundColor: 'var(--cardapio-bg-primary)',
    color: 'var(--cardapio-text-primary)',
  }

  return (
    <div
      className="min-h-[100dvh] flex flex-col"
      style={{ backgroundColor: 'var(--cardapio-bg-primary)' }}
    >
      <header
        className="border-b px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-3 flex-shrink-0 sticky top-0 z-10"
        style={{
          backgroundColor: 'var(--cardapio-bg-secondary)',
          borderColor: 'var(--cardapio-border)',
        }}
      >
        <button
          type="button"
          onClick={() => router.push(`/cardapio/${slug}/catalogo`)}
          className="flex items-center gap-1 text-sm font-medium min-h-[44px] px-1"
          style={{ color: 'var(--cardapio-text-primary)' }}
        >
          <MdArrowBack /> Voltar
        </button>
        <h1 className="font-bold text-base sm:text-lg" style={{ color: 'var(--cardapio-text-primary)' }}>
          Seu pedido
        </h1>
      </header>

      <div className="flex-1 w-full max-w-2xl mx-auto p-3 sm:p-4 space-y-4 sm:space-y-6 pb-32 sm:pb-6">
        {resumo.itens.length === 0 ? (
          <div className="text-center py-16">
            <p style={{ color: 'var(--cardapio-text-tertiary)' }}>Carrinho vazio</p>
            <button
              type="button"
              onClick={() => router.push(`/cardapio/${slug}/catalogo`)}
              className="mt-4 px-6 py-2 rounded-lg font-medium"
              style={{
                backgroundColor: 'var(--cardapio-btn-primary)',
                color: 'var(--cardapio-btn-primary-text)',
              }}
            >
              Ver cardápio
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-3">{resumo.itens.map(renderItem)}</div>

            <div
              className="rounded-xl border p-4 space-y-4"
              style={{ borderColor: 'var(--cardapio-border)' }}
            >
              <h2 className="font-semibold" style={{ color: 'var(--cardapio-text-primary)' }}>
                Dados para entrega
              </h2>

              <div className="flex gap-2">
                {(['retirada', 'entrega'] as const).map(tipo => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => setTipoEntrega(tipo)}
                    className="flex-1 py-2 rounded-lg border text-sm font-medium capitalize"
                    style={{
                      borderColor:
                        tipoEntrega === tipo
                          ? 'var(--cardapio-accent-primary)'
                          : 'var(--cardapio-border)',
                      backgroundColor:
                        tipoEntrega === tipo
                          ? 'var(--cardapio-menu-item-active)'
                          : 'transparent',
                    }}
                  >
                    {tipo}
                  </button>
                ))}
              </div>

              <input
                className={inputClass}
                style={inputStyle}
                placeholder="Telefone *"
                value={telefone}
                onChange={e => setTelefone(e.target.value)}
              />
              <input
                className={inputClass}
                style={inputStyle}
                placeholder="Nome (opcional)"
                value={nome}
                onChange={e => setNome(e.target.value)}
              />

              {tipoEntrega === 'entrega' && (
                <>
                  <input
                    className={inputClass}
                    style={inputStyle}
                    placeholder="Rua *"
                    value={rua}
                    onChange={e => setRua(e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className={inputClass}
                      style={inputStyle}
                      placeholder="Número *"
                      value={numero}
                      onChange={e => setNumero(e.target.value)}
                    />
                    <input
                      className={inputClass}
                      style={inputStyle}
                      placeholder="Bairro *"
                      value={bairro}
                      onChange={e => setBairro(e.target.value)}
                    />
                  </div>
                  <input
                    className={inputClass}
                    style={inputStyle}
                    placeholder="Cidade"
                    value={cidade}
                    onChange={e => setCidade(e.target.value)}
                  />
                </>
              )}

              {!loadingMeios && (meiosData?.meiosPagamento.length ?? 0) > 0 && (
                <div>
                  <label
                    className="block text-sm mb-1"
                    style={{ color: 'var(--cardapio-text-secondary)' }}
                  >
                    Forma de pagamento (opcional)
                  </label>
                  <select
                    className={inputClass}
                    style={inputStyle}
                    value={meioPagamentoId}
                    onChange={e => setMeioPagamentoId(e.target.value)}
                  >
                    <option value="">Selecionar na entrega</option>
                    {meiosData?.meiosPagamento.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.nome} — {m.formaPagamentoFiscalLabel}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="hidden sm:flex items-center justify-between text-lg font-bold pt-2">
              <span style={{ color: 'var(--cardapio-text-primary)' }}>Total</span>
              <span style={{ color: 'var(--cardapio-accent-primary)' }}>
                {formatarPreco(resumo.total)}
              </span>
            </div>

            <button
              type="button"
              disabled={enviando}
              onClick={handleEnviarPedido}
              className="hidden sm:block w-full py-3 rounded-xl font-semibold disabled:opacity-60"
              style={{
                backgroundColor: 'var(--cardapio-btn-primary)',
                color: 'var(--cardapio-btn-primary-text)',
              }}
            >
              {enviando ? 'Enviando...' : 'Confirmar pedido'}
            </button>
          </>
        )}
      </div>

      {resumo.itens.length > 0 && (
        <div
          className="sm:hidden fixed bottom-0 left-0 right-0 z-20 border-t px-4 py-3 flex items-center gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.15)]"
          style={{
            backgroundColor: 'var(--cardapio-bg-secondary)',
            borderColor: 'var(--cardapio-border)',
            paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
          }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs" style={{ color: 'var(--cardapio-text-secondary)' }}>
              Total
            </p>
            <p className="text-lg font-bold truncate" style={{ color: 'var(--cardapio-accent-primary)' }}>
              {formatarPreco(resumo.total)}
            </p>
          </div>
          <button
            type="button"
            disabled={enviando}
            onClick={handleEnviarPedido}
            className="flex-shrink-0 px-5 py-3 rounded-xl font-semibold disabled:opacity-60 min-h-[48px]"
            style={{
              backgroundColor: 'var(--cardapio-btn-primary)',
              color: 'var(--cardapio-btn-primary-text)',
            }}
          >
            {enviando ? 'Enviando...' : 'Confirmar'}
          </button>
        </div>
      )}
    </div>
  )
}
