'use client'

import { useState } from 'react'
import { Home, MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import type { EnderecoClienteDeliveryPublicoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { formatarResumoEnderecoPublico } from '../../../shared/utils/garantirEnderecoClientePublico'
import { etiquetaEnderecoPublicoLabel } from '../../../shared/utils/etiquetaEnderecoPublicoLabel'
import { DeliveryCheckoutConfirmarRemocaoEnderecoDialog } from './DeliveryCheckoutConfirmarRemocaoEnderecoDialog'
import { DeliveryCheckoutShellHeader } from './DeliveryCheckoutShell'

type DeliveryCheckoutEnderecosModalProps = {
  enderecos: EnderecoClienteDeliveryPublicoDTO[]
  enderecoIdSelecionado: string
  onClose: () => void
  onSelecionar: (enderecoId: string) => void
  onUsarNovoEndereco: () => void
  onEditar: (endereco: EnderecoClienteDeliveryPublicoDTO) => void
  onRemover: (enderecoId: string) => Promise<void> | void
}

export function DeliveryCheckoutEnderecosModal({
  enderecos,
  enderecoIdSelecionado,
  onClose,
  onSelecionar,
  onUsarNovoEndereco,
  onEditar,
  onRemover,
}: DeliveryCheckoutEnderecosModalProps) {
  const [enderecoParaRemover, setEnderecoParaRemover] =
    useState<EnderecoClienteDeliveryPublicoDTO | null>(null)
  const [removendo, setRemovendo] = useState(false)

  const ordenados = [...enderecos].sort((a, b) => {
    const ta = a.ultimaUtilizacaoEm ? Date.parse(a.ultimaUtilizacaoEm) : 0
    const tb = b.ultimaUtilizacaoEm ? Date.parse(b.ultimaUtilizacaoEm) : 0
    return tb - ta
  })

  const confirmarRemocao = async () => {
    if (!enderecoParaRemover) return
    setRemovendo(true)
    try {
      await onRemover(enderecoParaRemover.id)
      setEnderecoParaRemover(null)
    } finally {
      setRemovendo(false)
    }
  }

  return (
    <>
      <DeliveryCheckoutShellHeader
        title="Endereço de entrega"
        showBack
        onBack={onClose}
      />

      <p className="mb-3 text-sm delivery-text-secondary">Último endereço utilizado</p>

      <div className="space-y-3">
        {ordenados.map(endereco => {
          const selected = endereco.id === enderecoIdSelecionado
          const linha2 = [endereco.bairro, endereco.cidade, endereco.estado]
            .filter(Boolean)
            .join(', ')
          const bloqueado =
            removendo && enderecoParaRemover?.id === endereco.id

          return (
            <div
              key={endereco.id}
              className="w-full rounded-xl border p-3 text-left transition-colors"
              style={{
                borderColor: selected
                  ? 'var(--delivery-primary)'
                  : 'var(--delivery-border)',
                backgroundColor: 'var(--delivery-surface)',
              }}
            >
              <button
                type="button"
                onClick={() => onSelecionar(endereco.id)}
                disabled={bloqueado}
                className="flex w-full gap-3 text-left disabled:opacity-60"
              >
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
                    {etiquetaEnderecoPublicoLabel(endereco.etiqueta)}
                  </span>
                  <p className="text-sm font-semibold delivery-text-primary">
                    {endereco.rua}, {endereco.numero}
                  </p>
                  {linha2 ? (
                    <p className="mt-0.5 text-xs delivery-text-secondary">{linha2}</p>
                  ) : null}
                  <p className="sr-only">{formatarResumoEnderecoPublico(endereco)}</p>
                </div>
              </button>

              <div className="mt-2 flex justify-end gap-1 pl-8">
                <button
                  type="button"
                  aria-label={`Editar endereço ${endereco.rua}`}
                  disabled={removendo}
                  onClick={e => {
                    e.stopPropagation()
                    onEditar(endereco)
                  }}
                  className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg delivery-text-primary disabled:opacity-50"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={`Remover endereço ${endereco.rua}`}
                  disabled={removendo}
                  onClick={e => {
                    e.stopPropagation()
                    setEnderecoParaRemover(endereco)
                  }}
                  className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-red-600 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
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

      <DeliveryCheckoutConfirmarRemocaoEnderecoDialog
        open={Boolean(enderecoParaRemover)}
        resumoEndereco={
          enderecoParaRemover
            ? formatarResumoEnderecoPublico(enderecoParaRemover)
            : undefined
        }
        removendo={removendo}
        onConfirmar={() => void confirmarRemocao()}
        onCancelar={() => {
          if (removendo) return
          setEnderecoParaRemover(null)
        }}
      />
    </>
  )
}
