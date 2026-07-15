'use client'

import { useMemo, useState } from 'react'
import type { MeioPagamentoPublicoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import {
  formatBRLFromMaskedInput,
  parseBRLToNumber,
  transformarParaReal,
} from '@/src/shared/utils/formatters'
import { showToast } from '@/src/shared/utils/toast'
import { isMeioPagamentoDinheiro } from '../../../shared/utils/isMeioPagamentoDinheiro'
import { DeliveryCheckoutStepModal } from './DeliveryCheckoutStepModal'

type DeliveryCheckoutPagamentoModalProps = {
  total: number
  meiosPagamento: MeioPagamentoPublicoDTO[]
  loadingMeios: boolean
  meioPagamentoId: string
  trocoPara: number | null
  onChangeMeioPagamentoId: (value: string) => void
  onChangeTrocoPara: (value: number | null) => void
  onClose: () => void
  onContinuar: () => void
}

export function DeliveryCheckoutPagamentoModal({
  total,
  meiosPagamento,
  loadingMeios,
  meioPagamentoId,
  trocoPara,
  onChangeMeioPagamentoId,
  onChangeTrocoPara,
  onClose,
  onContinuar,
}: DeliveryCheckoutPagamentoModalProps) {
  const meioSelecionado = useMemo(
    () => meiosPagamento.find(m => m.id === meioPagamentoId) ?? null,
    [meiosPagamento, meioPagamentoId]
  )
  const ehDinheiro = isMeioPagamentoDinheiro(meioSelecionado)

  const [trocoInput, setTrocoInput] = useState(() =>
    trocoPara != null && trocoPara > 0 ? formatBRLFromMaskedInput(trocoPara) : ''
  )

  const handleSelectMeio = (id: string) => {
    onChangeMeioPagamentoId(id)
    const meio = meiosPagamento.find(m => m.id === id)
    if (!isMeioPagamentoDinheiro(meio)) {
      onChangeTrocoPara(null)
      setTrocoInput('')
    }
  }

  const handleTrocoChange = (raw: string) => {
    const masked = formatBRLFromMaskedInput(raw)
    setTrocoInput(masked)
    const parsed = parseBRLToNumber(masked)
    onChangeTrocoPara(parsed != null && parsed > 0 ? parsed : null)
  }

  const handleSemTroco = () => {
    onChangeTrocoPara(null)
    setTrocoInput('')
    showToast.success('Sem troco')
  }

  const handleContinuar = () => {
    if (!meioPagamentoId.trim()) {
      showToast.error('Selecione a forma de pagamento')
      return
    }
    if (ehDinheiro && trocoPara != null && trocoPara > 0 && trocoPara < total) {
      showToast.error('O valor do troco deve ser maior ou igual ao total')
      return
    }
    onContinuar()
  }

  const fieldClass =
    'w-full rounded-xl border bg-transparent px-3 py-3 text-sm outline-none delivery-text-primary'
  const fieldStyle = { borderColor: 'var(--delivery-border)' } as const

  return (
    <DeliveryCheckoutStepModal
      title="Pagamento"
      onClose={onClose}
      showBack
      onBack={onClose}
      footer={
        <button
          type="button"
          onClick={handleContinuar}
          className="min-h-[48px] w-full rounded-xl text-sm font-semibold uppercase tracking-wide"
          style={{
            backgroundColor: 'var(--delivery-primary-dark)',
            color: 'var(--delivery-btn-text, #ffffff)',
          }}
        >
          Continuar
        </button>
      }
    >
      <div className="space-y-4">
        <div
          className="space-y-2 rounded-xl border px-3 py-3"
          style={{ borderColor: 'var(--delivery-border)' }}
        >
          <div className="flex items-center justify-between text-sm">
            <span className="delivery-text-secondary">Subtotal</span>
            <span className="font-medium delivery-text-primary">
              {transformarParaReal(total)}
            </span>
          </div>
          <div
            className="flex items-center justify-between border-t pt-2 text-sm font-semibold"
            style={{ borderColor: 'var(--delivery-border)' }}
          >
            <span className="delivery-text-primary">Total</span>
            <span className="delivery-text-primary">{transformarParaReal(total)}</span>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium delivery-text-primary">
            Forma de pagamento
          </label>
          {loadingMeios ? (
            <p className="text-sm delivery-text-secondary">Carregando meios de pagamento...</p>
          ) : meiosPagamento.length === 0 ? (
            <p className="text-sm delivery-text-secondary">
              Nenhuma forma de pagamento disponível no momento.
            </p>
          ) : (
            <select
              className={fieldClass}
              style={fieldStyle}
              value={meioPagamentoId}
              onChange={e => handleSelectMeio(e.target.value)}
            >
              <option value="">Selecione</option>
              {meiosPagamento.map(m => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
          )}
        </div>

        {ehDinheiro ? (
          <div
            className="space-y-3 rounded-xl border px-3 py-3"
            style={{ borderColor: 'var(--delivery-border)' }}
          >
            <p className="text-sm font-semibold delivery-text-primary">Precisa de troco?</p>
            <p className="text-xs delivery-text-secondary">
              Informe o valor da nota que você vai pagar. Total do pedido:{' '}
              {transformarParaReal(total)}
            </p>
            <input
              className={fieldClass}
              style={fieldStyle}
              inputMode="decimal"
              placeholder="R$ 0,00"
              value={trocoInput}
              onChange={e => handleTrocoChange(e.target.value)}
              aria-label="Valor para troco"
            />
            {trocoPara != null && trocoPara > total ? (
              <p className="text-xs delivery-text-secondary">
                Troco a receber: {transformarParaReal(trocoPara - total)}
              </p>
            ) : null}
            <button
              type="button"
              onClick={handleSemTroco}
              className="min-h-[44px] w-full rounded-xl border text-sm font-semibold uppercase tracking-wide delivery-text-primary"
              style={{ borderColor: 'var(--delivery-border)' }}
            >
              Não preciso de troco
            </button>
          </div>
        ) : null}
      </div>
    </DeliveryCheckoutStepModal>
  )
}
