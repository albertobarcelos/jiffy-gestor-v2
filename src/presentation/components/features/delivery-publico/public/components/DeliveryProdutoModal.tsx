'use client'

import { useState } from 'react'
import { Camera } from 'lucide-react'
import { MdClose } from 'react-icons/md'
import type { CatalogoPublicoProdutoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { normalizeTipoImpactoPreco } from '@/src/application/mappers/VendaApiNormalizer'
import { formatarValorComplemento } from '@/src/domain/services/pedido/CalculadoraPedido'
import { showToast } from '@/src/shared/utils/toast'
import { DeliveryButton } from '../../shared/components/DeliveryButton'
import { DeliveryTextarea } from '../../shared/components/DeliveryInput'
import { DeliveryQuantidadeStepper } from '../../shared/components/DeliveryQuantidadeStepper'
import { useProdutoComplementos } from '../../shared/hooks/useProdutoComplementos'
import {
  useDeliveryCarrinhoStore,
  type DeliveryCarrinhoItem,
} from '../../shared/stores/deliveryCarrinhoStore'
import { observacaoItemCarrinho } from '../../shared/utils/deliveryCarrinhoItemUtils'
import { formatDeliveryCurrency } from '../../shared/utils/formatDeliveryCurrency'

type DeliveryProdutoModalProps = {
  slug: string
  produto: CatalogoPublicoProdutoDTO
  onClose: () => void
  onAdicionado?: () => void
  /** Quando informado, atualiza o item do carrinho em vez de adicionar um novo. */
  itemEdicao?: DeliveryCarrinhoItem
}

function ComplementoThumb({ imagemUrl, nome }: { imagemUrl: string | null; nome: string }) {
  return (
    <div
      className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md"
      style={{ backgroundColor: 'var(--delivery-surface-muted)' }}
    >
      {imagemUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imagemUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Camera
            className="h-4 w-4"
            style={{ color: 'var(--delivery-text-muted)' }}
            aria-hidden
          />
        </div>
      )}
      <span className="sr-only">{nome}</span>
    </div>
  )
}

export function DeliveryProdutoModal({
  slug,
  produto,
  onClose,
  onAdicionado,
  itemEdicao,
}: DeliveryProdutoModalProps) {
  const adicionarItem = useDeliveryCarrinhoStore(s => s.adicionarItem)
  const substituirItem = useDeliveryCarrinhoStore(s => s.substituirItem)
  const isEdicao = Boolean(itemEdicao)

  const [quantidade, setQuantidade] = useState(itemEdicao?.quantidade ?? 1)
  const [observacao, setObservacao] = useState(
    itemEdicao ? observacaoItemCarrinho(itemEdicao) : ''
  )
  const [salvando, setSalvando] = useState(false)

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
  } = useProdutoComplementos(slug, produto, itemEdicao?.complementos)

  const valorUnitario = produto.valor + valorComplementosUnitario
  const valorTotal = valorUnitario * quantidade

  const handleSalvar = () => {
    if (precisaComplementos && !cacheComplementos) {
      showToast.error('Aguarde o carregamento das opções do produto')
      return
    }
    if (grupos.length > 0 && !validar()) return

    setSalvando(true)
    try {
      const observacoes = observacao.trim().length >= 3 ? [observacao.trim()] : []
      const payload = {
        produtoId: produto.id,
        produtoNome: produto.nome,
        produtoImagemUrl: produto.imagemUrl,
        quantidade,
        valorUnitario,
        valorTotal,
        observacoes,
        complementos: complementosSelecionados,
      }

      if (itemEdicao) {
        substituirItem(slug, itemEdicao.id, payload)
        showToast.success('Item atualizado!')
      } else {
        adicionarItem(slug, payload)
        showToast.success('Produto adicionado ao carrinho!')
        onAdicionado?.()
      }
      onClose()
    } finally {
      setSalvando(false)
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
          <div className="mb-4">
            <p className="delivery-font-title mb-3 font-semibold delivery-text-primary">
              Complementos
            </p>
            <div className="space-y-4">
              {grupos.map(grupo => (
                <div key={grupo.id}>
                  <div
                    className="mb-1.5 flex items-baseline justify-between gap-2 rounded-md px-2.5 py-1.5"
                    style={{
                      backgroundColor: 'var(--delivery-primary-dark)',
                      color: 'var(--delivery-btn-text, #ffffff)',
                    }}
                  >
                    <p className="delivery-font-title min-w-0 text-sm font-semibold uppercase tracking-wide">
                      {grupo.nome}
                      {grupo.obrigatorio ? <span className="ml-1 text-red-400">*</span> : null}
                    </p>
                    <span className="shrink-0 text-xs font-medium tabular-nums opacity-90">
                      Min: {grupo.qtdMinima} - Max: {grupo.qtdMaxima}
                    </span>
                  </div>
                  <div>
                    {grupo.complementos.map(comp => {
                      const qtdComp = getQuantidadeComplemento(grupo.id, comp.id)
                      const tipoIp = normalizeTipoImpactoPreco(comp.tipoImpactoPreco)

                      return (
                        <div
                          key={comp.id}
                          className="flex items-center justify-between gap-3 py-1.5"
                        >
                          <div className="flex min-w-0 flex-1 items-start gap-2.5">
                            <ComplementoThumb imagemUrl={comp.imagemUrl} nome={comp.nome} />
                            <div className="min-w-0 flex-1 pt-0.5">
                              <p
                                className="truncate text-sm font-medium leading-snug delivery-text-primary"
                                title={comp.nome}
                              >
                                {comp.nome}
                              </p>
                              <p className="mt-0.5 text-xs font-semibold tabular-nums delivery-text-accent sm:text-sm">
                                {formatarValorComplemento(comp.valor, tipoIp)}
                              </p>
                            </div>
                          </div>
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
          </div>
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
          disabled={salvando || (precisaComplementos && carregandoComplementos && !cacheComplementos)}
          onClick={handleSalvar}
          style={{
            backgroundColor: 'var(--delivery-primary-dark)',
            color: 'var(--delivery-btn-text, #ffffff)',
          }}
        >
          {salvando
            ? isEdicao
              ? 'Salvando...'
              : 'Adicionando...'
            : `${isEdicao ? 'Salvar' : 'Adicionar'} · ${formatDeliveryCurrency(valorTotal)}`}
        </DeliveryButton>
      </div>
    </div>
  )
}
