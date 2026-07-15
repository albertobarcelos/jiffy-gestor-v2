'use client'

import { ArrowLeftRight, Bike, MapPin, Pencil } from 'lucide-react'
import type { EnderecoClienteDeliveryPublicoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import type { DeliveryTipoEntrega } from '../../../shared/stores/deliveryPreferenciaEntregaStore'
import { formatarResumoEnderecoPublico } from '../../../shared/utils/garantirEnderecoClientePublico'

type DeliveryCarrinhoEnderecoTopoProps = {
  tipoEntrega: DeliveryTipoEntrega
  enderecoCliente: EnderecoClienteDeliveryPublicoDTO | null
  enderecoEmpresaTexto: string | null
  onInformar: () => void
  onAlterarEndereco: () => void
  onToggleTipoEntrega: () => void
}

export function DeliveryCarrinhoEnderecoTopo({
  tipoEntrega,
  enderecoCliente,
  enderecoEmpresaTexto,
  onInformar,
  onAlterarEndereco,
  onToggleTipoEntrega,
}: DeliveryCarrinhoEnderecoTopoProps) {
  const isEntrega = tipoEntrega === 'entrega'
  const temEnderecoCliente = Boolean(enderecoCliente)

  return (
    <div
      className="space-y-2 rounded-xl p-3"
      style={{ backgroundColor: 'var(--delivery-surface-muted)' }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: 'var(--delivery-surface)' }}
        >
          {isEntrega ? (
            <Bike className="h-5 w-5" style={{ color: 'var(--delivery-text-muted)' }} aria-hidden />
          ) : (
            <MapPin className="h-5 w-5" style={{ color: 'var(--delivery-text-muted)' }} aria-hidden />
          )}
        </div>

        <div className="min-w-0 flex-1">
          {isEntrega && !temEnderecoCliente ? (
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium delivery-text-primary">Seu endereço</p>
              <button
                type="button"
                onClick={onInformar}
                className="shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide delivery-text-primary"
                style={{
                  borderColor: 'var(--delivery-border)',
                  backgroundColor: 'var(--delivery-surface)',
                }}
              >
                Informar
              </button>
            </div>
          ) : null}

          {isEntrega && enderecoCliente ? (
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs delivery-text-secondary">Seu endereço:</p>
                <p className="text-sm font-semibold delivery-text-primary">
                  {enderecoCliente.rua}, {enderecoCliente.numero}
                </p>
                <p className="text-xs delivery-text-secondary">
                  {[enderecoCliente.bairro, etiquetaLabel(enderecoCliente.etiqueta)]
                    .filter(Boolean)
                    .join(' - ')}
                </p>
                <p className="sr-only">{formatarResumoEnderecoPublico(enderecoCliente)}</p>
              </div>
              <button
                type="button"
                onClick={onAlterarEndereco}
                aria-label="Alterar endereço"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
              >
                <Pencil className="h-4 w-4" style={{ color: 'var(--delivery-text-muted)' }} />
              </button>
            </div>
          ) : null}

          {!isEntrega ? (
            <div>
              <p className="text-xs delivery-text-secondary">Retirada no local:</p>
              <p className="text-sm font-semibold delivery-text-primary">
                {enderecoEmpresaTexto || 'Endereço da loja indisponível'}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={onToggleTipoEntrega}
        className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm"
        style={{ backgroundColor: 'var(--delivery-surface)' }}
      >
        <span className="delivery-text-primary">
          Mudar para{' '}
          <span className="font-semibold">{isEntrega ? 'retirada' : 'entrega'}</span>
        </span>
        <ArrowLeftRight
          className="h-4 w-4 shrink-0"
          style={{ color: 'var(--delivery-text-muted)' }}
          aria-hidden
        />
      </button>
    </div>
  )
}

function etiquetaLabel(etiqueta: string): string {
  const e = etiqueta.toLowerCase()
  if (e === 'casa') return 'Casa'
  if (e === 'trabalho') return 'Trabalho'
  return etiqueta
}
