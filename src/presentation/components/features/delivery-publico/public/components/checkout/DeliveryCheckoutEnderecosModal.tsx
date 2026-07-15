'use client'

import { Home, MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import type { EnderecoClienteDeliveryPublicoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { formatarResumoEnderecoPublico } from '../../../shared/utils/garantirEnderecoClientePublico'
import { DeliveryCheckoutStepModal } from './DeliveryCheckoutStepModal'

type DeliveryCheckoutEnderecosModalProps = {
  enderecos: EnderecoClienteDeliveryPublicoDTO[]
  enderecoIdSelecionado: string
  onClose: () => void
  onSelecionar: (enderecoId: string) => void
  onUsarNovoEndereco: () => void
}

function etiquetaLabel(etiqueta: string): string {
  const e = etiqueta.toLowerCase()
  if (e === 'casa') return 'Casa'
  if (e === 'trabalho') return 'Trabalho'
  return etiqueta.charAt(0).toUpperCase() + etiqueta.slice(1)
}

export function DeliveryCheckoutEnderecosModal({
  enderecos,
  enderecoIdSelecionado,
  onClose,
  onSelecionar,
  onUsarNovoEndereco,
}: DeliveryCheckoutEnderecosModalProps) {
  const ordenados = [...enderecos].sort((a, b) => {
    const ta = a.ultimaUtilizacaoEm ? Date.parse(a.ultimaUtilizacaoEm) : 0
    const tb = b.ultimaUtilizacaoEm ? Date.parse(b.ultimaUtilizacaoEm) : 0
    return tb - ta
  })

  return (
    <DeliveryCheckoutStepModal title="Endereço de entrega" onClose={onClose}>
      <p className="mb-3 text-sm delivery-text-secondary">Último endereço utilizado</p>

      <div className="space-y-3">
        {ordenados.map(endereco => {
          const selected = endereco.id === enderecoIdSelecionado
          const linha2 = [endereco.bairro, endereco.cidade, endereco.estado]
            .filter(Boolean)
            .join(', ')

          return (
            <button
              key={endereco.id}
              type="button"
              onClick={() => onSelecionar(endereco.id)}
              className="w-full rounded-xl border p-3 text-left transition-colors"
              style={{
                borderColor: selected
                  ? 'var(--delivery-primary)'
                  : 'var(--delivery-border)',
                backgroundColor: 'var(--delivery-surface)',
              }}
            >
              <div className="flex gap-3">
                <MapPin
                  className="mt-0.5 h-5 w-5 shrink-0"
                  style={{ color: 'var(--delivery-text-primary)' }}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <span
                    className="mb-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                    style={{ backgroundColor: 'var(--delivery-surface-muted)' }}
                  >
                    <Home className="h-3 w-3" aria-hidden />
                    {etiquetaLabel(endereco.etiqueta)}
                  </span>
                  <p className="text-sm font-semibold delivery-text-primary">
                    {endereco.rua}, {endereco.numero}
                  </p>
                  {linha2 ? (
                    <p className="mt-0.5 text-xs delivery-text-secondary">{linha2}</p>
                  ) : null}
                  <p className="sr-only">{formatarResumoEnderecoPublico(endereco)}</p>
                  <div className="mt-2 flex gap-3">
                    <span className="inline-flex text-delivery-text-muted" aria-hidden>
                      <Pencil className="h-4 w-4 opacity-40" />
                    </span>
                    <span className="inline-flex" aria-hidden>
                      <Trash2 className="h-4 w-4 opacity-40" />
                    </span>
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={onUsarNovoEndereco}
        className="mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold uppercase tracking-wide delivery-text-primary"
        style={{ borderColor: 'var(--delivery-border)' }}
      >
        <Plus className="h-4 w-4" aria-hidden />
        Use um novo endereço
      </button>
    </DeliveryCheckoutStepModal>
  )
}
