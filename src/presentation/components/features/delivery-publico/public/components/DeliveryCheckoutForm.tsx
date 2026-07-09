'use client'

import type { MeioPagamentoPublicoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { formatarTelefoneBr } from '@/src/shared/utils/telefoneBr'
import type { CheckoutFormData } from '../../shared/utils/montarPedidoPublico'
import { DeliveryInput, DeliverySelect } from '../../shared/components/DeliveryInput'
import { DeliveryTipoEntregaToggle } from '../../shared/components/DeliveryTipoEntregaToggle'

type DeliveryCheckoutFormProps = {
  form: CheckoutFormData
  meiosPagamento: MeioPagamentoPublicoDTO[]
  loadingMeios: boolean
  onChange: <K extends keyof CheckoutFormData>(key: K, value: CheckoutFormData[K]) => void
}

export function DeliveryCheckoutForm({
  form,
  meiosPagamento,
  loadingMeios,
  onChange,
}: DeliveryCheckoutFormProps) {
  return (
    <div className="delivery-checkout-form-card space-y-4 rounded-xl border p-4">
      <h2 className="delivery-checkout-form-title delivery-font-title text-base font-semibold sm:text-lg">
        {form.tipoEntrega === 'entrega' ? 'Dados para entrega' : 'Dados para retirada'}
      </h2>

      <DeliveryTipoEntregaToggle
        variant="segmented"
        segmentedTone="checkout"
        value={form.tipoEntrega}
        interactive
        onChange={value => onChange('tipoEntrega', value)}
      />

      <DeliveryInput
        variant="checkout"
        placeholder="Telefone *"
        value={form.telefone}
        onChange={e => onChange('telefone', formatarTelefoneBr(e.target.value))}
        inputMode="tel"
        autoComplete="tel"
        maxLength={15}
      />
      <DeliveryInput
        variant="checkout"
        placeholder="Nome (opcional)"
        value={form.nome}
        onChange={e => onChange('nome', e.target.value)}
        autoComplete="name"
      />

      {form.tipoEntrega === 'entrega' ? (
        <>
          <DeliveryInput
            variant="checkout"
            placeholder="Rua *"
            value={form.rua}
            onChange={e => onChange('rua', e.target.value)}
            autoComplete="street-address"
          />
          <div className="grid grid-cols-2 gap-2">
            <DeliveryInput
              variant="checkout"
              placeholder="Número *"
              value={form.numero}
              onChange={e => onChange('numero', e.target.value)}
            />
            <DeliveryInput
              variant="checkout"
              placeholder="Bairro *"
              value={form.bairro}
              onChange={e => onChange('bairro', e.target.value)}
            />
          </div>
          <DeliveryInput
            variant="checkout"
            placeholder="Cidade"
            value={form.cidade}
            onChange={e => onChange('cidade', e.target.value)}
            autoComplete="address-level2"
          />
        </>
      ) : null}

      {!loadingMeios && meiosPagamento.length > 0 ? (
        <div>
          <label
            className="mb-1 block text-sm font-medium"
            style={{ color: 'var(--delivery-primary)' }}
          >
            Forma de pagamento (opcional)
          </label>
          <DeliverySelect
            variant="checkout"
            value={form.meioPagamentoId}
            onChange={e => onChange('meioPagamentoId', e.target.value)}
          >
            <option value="">Selecionar na entrega</option>
            {meiosPagamento.map(m => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </DeliverySelect>
        </div>
      ) : null}
    </div>
  )
}
