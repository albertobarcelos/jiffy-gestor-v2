'use client'

import { useState } from 'react'
import { MdClose } from 'react-icons/md'
import type { CatalogoPublicoProdutoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { normalizeTipoImpactoPreco } from '@/src/application/mappers/VendaApiNormalizer'
import { formatarValorComplemento } from '@/src/domain/services/pedido/CalculadoraPedido'
import { showToast } from '@/src/shared/utils/toast'
import { DeliveryButton } from '../../shared/components/DeliveryButton'
import { DeliveryCard } from '../../shared/components/DeliveryCard'
import { DeliveryTextarea } from '../../shared/components/DeliveryInput'
import { DeliveryQuantidadeStepper } from '../../shared/components/DeliveryQuantidadeStepper'
import { useProdutoComplementos } from '../../shared/hooks/useProdutoComplementos'
import { useDeliveryCarrinhoStore } from '../../shared/stores/deliveryCarrinhoStore'
import { formatDeliveryCurrency } from '../../shared/utils/formatDeliveryCurrency'

type DeliveryProdutoModalProps = {
  slug: string
  produto: CatalogoPublicoProdutoDTO
  onClose: () => void
  onAdicionado?: () => void
}

export function DeliveryProdutoModal({
  slug,
  produto,
  onClose,
  onAdicionado,
}: DeliveryProdutoModalProps) {
  const adicionarItem = useDeliveryCarrinhoStore(s => s.adicionarItem)
  const [quantidade, setQuantidade] = useState(1)
  const [observacao, setObservacao] = useState('')
  const [adicionando, setAdicionando] = useState(false)

  const {
    grupos,
    precisaComplementos,
    carregandoComplementos,
    cacheComplementos,
    complementosSelecionados,
    valorComplementosUnitario,
    ajustarQuantidadeComplemento,
    getQuantidadeComplemento,
    validar,
  } = useProdutoComplementos(slug, produto)

  const valorUnitario = produto.valor + valorComplementosUnitario
  const valorTotal = valorUnitario * quantidade

  const handleAdicionar = () => {
    if (precisaComplementos && !cacheComplementos) {
      showToast.error('Aguarde o carregamento das opções do produto')
      return
    }
    if (grupos.length > 0 && !validar()) return

    setAdicionando(true)
    try {
      const observacoes = observacao.trim().length >= 3 ? [observacao.trim()] : []

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
      onAdicionado?.()
      onClose()
    } finally {
      setAdicionando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'var(--delivery-overlay)' }}
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl sm:max-h-[90vh] sm:max-w-lg sm:rounded-2xl sm:p-5"
        style={{ backgroundColor: 'var(--delivery-surface)' }}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="delivery-font-title text-xl font-bold delivery-text-primary">
              {produto.nome}
            </h2>
            <p className="mt-1 text-lg font-semibold delivery-text-accent">
              {formatDeliveryCurrency(produto.valor)}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar">
            <MdClose className="h-6 w-6 delivery-text-secondary" />
          </button>
        </div>

        {produto.descricao ? (
          <p className="delivery-text-secondary mb-4 text-sm">{produto.descricao}</p>
        ) : null}

        {grupos.length > 0 ? (
          <DeliveryCard className="mb-4">
            <p className="delivery-font-title mb-3 font-semibold delivery-text-primary">
              Complementos
            </p>
            <div className="space-y-3">
              {grupos.map(grupo => (
                <div
                  key={grupo.id}
                  className="rounded-md border px-2 py-1.5"
                  style={{ borderColor: 'var(--delivery-card-border)' }}
                >
                  <p className="delivery-font-title mb-1.5 text-sm font-semibold uppercase tracking-wide delivery-text-primary">
                    {grupo.nome}
                    {grupo.obrigatorio ? <span className="ml-1 text-red-500">*</span> : null}
                  </p>
                  <div className="space-y-1">
                    {grupo.complementos.map(comp => {
                      const qtdComp = getQuantidadeComplemento(grupo.id, comp.id)
                      const tipoIp = normalizeTipoImpactoPreco(comp.tipoImpactoPreco)

                      return (
                        <div
                          key={comp.id}
                          className="flex items-center justify-between gap-2 rounded px-2 py-1.5"
                          style={{ backgroundColor: 'var(--delivery-card-hover)' }}
                        >
                          <span
                            className="min-w-0 flex-1 truncate text-sm font-medium delivery-text-primary"
                            title={comp.nome}
                          >
                            {comp.nome}
                          </span>
                          <span className="shrink-0 text-sm font-semibold tabular-nums delivery-text-accent">
                            {formatarValorComplemento(comp.valor, tipoIp)}
                          </span>
                          <DeliveryQuantidadeStepper
                            size="sm"
                            value={qtdComp}
                            min={0}
                            disabledDecrease={qtdComp <= 0}
                            decreaseLabel={`Diminuir quantidade de ${comp.nome}`}
                            increaseLabel={`Aumentar quantidade de ${comp.nome}`}
                            onDecrease={() => ajustarQuantidadeComplemento(grupo, comp.id, -1)}
                            onIncrease={() => ajustarQuantidadeComplemento(grupo, comp.id, 1)}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            <p className="delivery-text-secondary mt-3 text-right text-sm font-medium">
              Total dos complementos:{' '}
              <span className="delivery-text-accent">
                {formatDeliveryCurrency(valorComplementosUnitario)}
              </span>
            </p>
          </DeliveryCard>
        ) : null}

        {precisaComplementos && carregandoComplementos && !cacheComplementos ? (
          <p className="delivery-text-secondary mb-4 text-sm">Carregando opções...</p>
        ) : null}

        <div className="mb-4">
          <label className="delivery-text-secondary mb-1 block text-sm font-medium">
            Observação (opcional)
          </label>
          <DeliveryTextarea
            value={observacao}
            onChange={e => setObservacao(e.target.value)}
            rows={2}
            maxLength={100}
            placeholder="Ex.: sem cebola"
          />
        </div>

        <div className="mb-4 flex items-center justify-between">
          <span className="delivery-text-secondary">Quantidade</span>
          <DeliveryQuantidadeStepper
            value={quantidade}
            min={1}
            decreaseLabel="Diminuir quantidade do produto"
            increaseLabel="Aumentar quantidade do produto"
            onDecrease={() => setQuantidade(q => Math.max(1, q - 1))}
            onIncrease={() => setQuantidade(q => q + 1)}
          />
        </div>

        <DeliveryButton
          fullWidth
          disabled={adicionando || (precisaComplementos && carregandoComplementos && !cacheComplementos)}
          onClick={handleAdicionar}
        >
          {adicionando ? 'Adicionando...' : `Adicionar · ${formatDeliveryCurrency(valorTotal)}`}
        </DeliveryButton>
      </div>
    </div>
  )
}
