'use client'

import { useState } from 'react'
import { Home, MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import type { EnderecoClienteDeliveryPublicoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import type { GeoJsonPoint } from '@/src/shared/types/geoJsonPoint'
import { formatarResumoEnderecoPublico } from '../../../shared/utils/garantirEnderecoClientePublico'
import { etiquetaEnderecoPublicoLabel } from '../../../shared/utils/etiquetaEnderecoPublicoLabel'
import {
  calcularDistanciaAproximadaDaLoja,
  pontoClienteParaDistancia,
} from '../../../shared/utils/formatarDistanciaAproximadaDaLoja'
import { DeliveryCheckoutConfirmarRemocaoEnderecoDialog } from './DeliveryCheckoutConfirmarRemocaoEnderecoDialog'
import { DeliveryCheckoutShellHeader } from './DeliveryCheckoutShell'
import { DeliveryDistanciaLojaHint } from './DeliveryDistanciaLojaHint'

type DeliveryCheckoutEnderecosModalProps = {
  enderecos: EnderecoClienteDeliveryPublicoDTO[]
  enderecoIdSelecionado: string
  localizacaoEmpresa?: GeoJsonPoint | null
  onClose: () => void
  onSelecionar: (enderecoId: string) => void
  onUsarNovoEndereco: () => void
  onEditar: (endereco: EnderecoClienteDeliveryPublicoDTO) => void
  onRemover: (enderecoId: string) => Promise<void> | void
  /** Cliente no limite — botão visualmente bloqueado, mas ainda clicável para o aviso. */
  novoEnderecoBloqueado?: boolean
}

export function DeliveryCheckoutEnderecosModal({
  enderecos,
  enderecoIdSelecionado,
  localizacaoEmpresa = null,
  onClose,
  onSelecionar,
  onUsarNovoEndereco,
  onEditar,
  onRemover,
  novoEnderecoBloqueado = false,
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
              role="button"
              tabIndex={bloqueado ? -1 : 0}
              onClick={() => {
                if (!bloqueado) onSelecionar(endereco.id)
              }}
              onKeyDown={e => {
                if (bloqueado) return
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelecionar(endereco.id)
                }
              }}
              className="w-full cursor-pointer rounded-xl border p-3 text-left transition-colors disabled:opacity-60"
              style={{
                borderColor: selected
                  ? 'var(--delivery-primary)'
                  : 'var(--delivery-border)',
                backgroundColor: 'var(--delivery-surface)',
                opacity: bloqueado ? 0.6 : undefined,
              }}
            >
              <div className="flex gap-3">
                <MapPin
                  className="mt-1 h-5 w-5 shrink-0"
                  style={{ color: 'var(--delivery-text-primary)' }}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                      style={{ backgroundColor: 'var(--delivery-surface-muted)' }}
                    >
                      <Home className="h-3 w-3" aria-hidden />
                      {etiquetaEnderecoPublicoLabel(endereco.etiqueta)}
                    </span>
                    <div className="-mr-1 ml-auto flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        aria-label={`Editar endereço ${endereco.rua}`}
                        disabled={removendo}
                        onClick={e => {
                          e.stopPropagation()
                          onEditar(endereco)
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg delivery-text-primary disabled:opacity-50"
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
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-600 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <p className="mt-1 text-sm font-semibold delivery-text-primary">
                    {endereco.rua}, {endereco.numero}
                  </p>
                  {linha2 ? (
                    <p className="mt-0.5 text-xs delivery-text-secondary">{linha2}</p>
                  ) : null}
                  <DeliveryDistanciaLojaHint
                    texto={calcularDistanciaAproximadaDaLoja(
                      localizacaoEmpresa,
                      pontoClienteParaDistancia(endereco)
                    )}
                  />
                  <p className="sr-only">{formatarResumoEnderecoPublico(endereco)}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <button
        type="button"
        onClick={onUsarNovoEndereco}
        aria-disabled={novoEnderecoBloqueado || undefined}
        className={`mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold uppercase tracking-wide delivery-text-primary ${
          novoEnderecoBloqueado ? 'opacity-50' : ''
        }`}
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
