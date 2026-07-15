'use client'

import type { ReactNode } from 'react'
import { Camera, MapPin, Pencil, Bike, UserRound } from 'lucide-react'
import type { EnderecoClienteDeliveryPublicoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import type { MeioPagamentoPublicoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { formatarTelefoneBr } from '@/src/shared/utils/telefoneBr'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import type { DeliveryCarrinhoItem } from '../../../shared/stores/deliveryCarrinhoStore'
import type { DeliveryTipoEntrega } from '../../../shared/stores/deliveryPreferenciaEntregaStore'
import { formatDeliveryCurrency } from '../../../shared/utils/formatDeliveryCurrency'
import { obterIconeMeioPagamento } from '../../../shared/utils/obterIconeMeioPagamento'
import { DeliveryCheckoutStepModal } from './DeliveryCheckoutStepModal'

type DeliveryCheckoutRevisaoModalProps = {
  tipoEntrega: DeliveryTipoEntrega
  nome: string
  telefone: string
  enderecoCliente: EnderecoClienteDeliveryPublicoDTO | null
  enderecoEmpresaTexto: string | null
  itens: DeliveryCarrinhoItem[]
  total: number
  meioPagamento: MeioPagamentoPublicoDTO | null
  trocoPara: number | null
  observacaoPedido: string
  enviando: boolean
  onClose: () => void
  onVoltar: () => void
  onEditarCliente: () => void
  onEditarEndereco: () => void
  onEditarPedido: () => void
  onEditarPagamento: () => void
  onEditarObservacoes: () => void
  onEnviar: () => void
}

function IconeCaixa({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
      style={{ backgroundColor: 'var(--delivery-surface-muted)' }}
    >
      {children}
    </div>
  )
}

function BotaoEditarLapiz({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
    >
      <Pencil className="h-5 w-5" style={{ color: 'var(--delivery-text-muted)' }} strokeWidth={1.75} />
    </button>
  )
}

function LinhaSecao({
  icone,
  label,
  onEditar,
  editLabel,
  children,
}: {
  icone?: ReactNode
  label: string
  onEditar?: () => void
  editLabel?: string
  children: ReactNode
}) {
  return (
    <div
      className="flex items-start gap-3 border-b py-3"
      style={{ borderColor: 'var(--delivery-border)' }}
    >
      {icone ? <IconeCaixa>{icone}</IconeCaixa> : null}
      <div className="min-w-0 flex-1">
        <p className="text-xs delivery-text-secondary">{label}</p>
        {children}
      </div>
      {onEditar ? <BotaoEditarLapiz onClick={onEditar} label={editLabel ?? 'Editar'} /> : null}
    </div>
  )
}

function ProdutoThumb({ imagemUrl, nome }: { imagemUrl: string | null; nome: string }) {
  return (
    <div
      className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg"
      style={{ backgroundColor: 'var(--delivery-surface-muted)' }}
    >
      {imagemUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imagemUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Camera className="h-4 w-4" style={{ color: 'var(--delivery-text-muted)' }} aria-hidden />
        </div>
      )}
      <span className="sr-only">{nome}</span>
    </div>
  )
}

export function DeliveryCheckoutRevisaoModal({
  tipoEntrega,
  nome,
  telefone,
  enderecoCliente,
  enderecoEmpresaTexto,
  itens,
  total,
  meioPagamento,
  trocoPara,
  observacaoPedido,
  enviando,
  onClose,
  onVoltar,
  onEditarCliente,
  onEditarEndereco,
  onEditarPedido,
  onEditarPagamento,
  onEditarObservacoes,
  onEnviar,
}: DeliveryCheckoutRevisaoModalProps) {
  const telefoneExibicao = telefone.trim()
    ? formatarTelefoneBr(telefone)
    : 'Não informado'
  const nomeExibicao = nome.trim() || 'Não informado'
  const IconePagamento = obterIconeMeioPagamento(meioPagamento?.nome ?? '')
  const isEntrega = tipoEntrega === 'entrega'

  return (
    <DeliveryCheckoutStepModal
      title="Revise seu pedido"
      onClose={onClose}
      showBack
      onBack={onVoltar}
      fullScreen
      footer={
        <button
          type="button"
          disabled={enviando}
          onClick={onEnviar}
          className="min-h-[48px] w-full rounded-xl text-sm font-semibold uppercase tracking-wide disabled:opacity-60"
          style={{
            backgroundColor: 'var(--delivery-primary-dark)',
            color: 'var(--delivery-btn-text, #ffffff)',
          }}
        >
          {enviando ? 'Enviando...' : 'Enviar pedido'}
        </button>
      }
    >
      <div>
        <LinhaSecao
          icone={
            <UserRound className="h-5 w-5" style={{ color: 'var(--delivery-text-muted)' }} />
          }
          label={isEntrega ? 'Entregue a:' : 'Pedido de:'}
          onEditar={onEditarCliente}
          editLabel="Editar cliente"
        >
          <p className="text-sm font-semibold delivery-text-primary">{nomeExibicao}</p>
          <p className="text-sm delivery-text-secondary">{telefoneExibicao}</p>
        </LinhaSecao>

        <LinhaSecao
          icone={
            isEntrega ? (
              <Bike className="h-5 w-5" style={{ color: 'var(--delivery-text-muted)' }} />
            ) : (
              <MapPin className="h-5 w-5" style={{ color: 'var(--delivery-text-muted)' }} />
            )
          }
          label={isEntrega ? 'Seu endereço:' : 'Retirada no local:'}
          onEditar={isEntrega ? onEditarEndereco : undefined}
          editLabel="Editar endereço"
        >
          {isEntrega && enderecoCliente ? (
            <>
              <p className="text-sm font-semibold delivery-text-primary">
                {enderecoCliente.rua}, {enderecoCliente.numero}
              </p>
              <p className="text-sm delivery-text-secondary">
                {[
                  enderecoCliente.bairro,
                  etiquetaLabel(enderecoCliente.etiqueta),
                ]
                  .filter(Boolean)
                  .join(' - ')}
              </p>
            </>
          ) : null}
          {isEntrega && !enderecoCliente ? (
            <p className="text-sm delivery-text-secondary">Endereço não informado</p>
          ) : null}
          {!isEntrega ? (
            <p className="text-sm font-semibold delivery-text-primary">
              {enderecoEmpresaTexto || 'Endereço da loja indisponível'}
            </p>
          ) : null}
        </LinhaSecao>

        <LinhaSecao
          icone={
            <IconePagamento
              className="h-5 w-5"
              style={{ color: 'var(--delivery-text-muted)' }}
            />
          }
          label="Pagamento:"
          onEditar={onEditarPagamento}
          editLabel="Editar pagamento"
        >
          <p className="text-sm font-semibold delivery-text-primary">
            {meioPagamento?.nome ?? 'Não selecionado'}
          </p>
          {trocoPara != null && trocoPara > 0 ? (
            <p className="text-sm delivery-text-secondary">
              Troco para {transformarParaReal(trocoPara)}
            </p>
          ) : null}
        </LinhaSecao>

        <div
          className="flex items-center justify-between gap-2 border-b py-3"
          style={{ borderColor: 'var(--delivery-border)' }}
        >
          <h3 className="text-sm font-semibold delivery-text-primary">Seu pedido</h3>
          <BotaoEditarLapiz onClick={onEditarPedido} label="Editar pedido" />
        </div>

        <ul>
          {itens.map(item => (
            <li
              key={item.id}
              className="flex items-center gap-2.5 border-b py-3"
              style={{ borderColor: 'var(--delivery-border)' }}
            >
              <ProdutoThumb imagemUrl={item.produtoImagemUrl} nome={item.produtoNome} />
              <span className="min-w-0 flex-1 text-sm delivery-text-primary">
                <span className="font-semibold">{item.quantidade}x</span> {item.produtoNome}
              </span>
              <span className="shrink-0 text-sm tabular-nums delivery-text-primary">
                {formatDeliveryCurrency(item.valorTotal)}
              </span>
            </li>
          ))}
        </ul>

        <LinhaSecao
          label="Observações:"
          onEditar={onEditarObservacoes}
          editLabel="Editar observações"
        >
          <p className="text-sm delivery-text-secondary whitespace-pre-wrap">
            {observacaoPedido.trim() || 'Nenhuma observação'}
          </p>
        </LinhaSecao>

        <div className="space-y-2 pt-3">
          <div className="flex items-center justify-between text-sm">
            <span className="delivery-text-secondary">Subtotal</span>
            <span className="font-medium delivery-text-primary">
              {transformarParaReal(total)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm font-semibold">
            <span className="delivery-text-primary">Total</span>
            <span className="delivery-text-primary">{transformarParaReal(total)}</span>
          </div>
        </div>
      </div>
    </DeliveryCheckoutStepModal>
  )
}

function etiquetaLabel(etiqueta: string): string {
  const e = etiqueta.toLowerCase()
  if (e === 'casa') return 'Casa'
  if (e === 'trabalho') return 'Trabalho'
  return etiqueta
}
