'use client'

import type { MeioPagamentoPublicoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import type { CheckoutFormData } from '../../shared/utils/montarPedidoPublico'
import { DeliveryCard } from '../../shared/components/DeliveryCard'
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
    <DeliveryCard className="space-y-4 !p-4 rounded-xl">
      <h2 className="delivery-font-title font-semibold delivery-text-primary">
        Dados para entrega
      </h2>

      <DeliveryTipoEntregaToggle
        variant="segmented"
        value={form.tipoEntrega}
        interactive
        onChange={value => onChange('tipoEntrega', value)}
      />

      <DeliveryInput
        placeholder="Telefone *"
        value={form.telefone}
        onChange={e => onChange('telefone', e.target.value)}
        inputMode="tel"
        autoComplete="tel"
      />
      <DeliveryInput
        placeholder="Nome (opcional)"
        value={form.nome}
        onChange={e => onChange('nome', e.target.value)}
        autoComplete="name"
      />

      {form.tipoEntrega === 'entrega' ? (
        <>
          <DeliveryInput
            placeholder="Rua *"
            value={form.rua}
            onChange={e => onChange('rua', e.target.value)}
            autoComplete="street-address"
          />
          <div className="grid grid-cols-2 gap-2">
            <DeliveryInput
              placeholder="Número *"
              value={form.numero}
              onChange={e => onChange('numero', e.target.value)}
            />
            <DeliveryInput
              placeholder="Bairro *"
              value={form.bairro}
              onChange={e => onChange('bairro', e.target.value)}
            />
          </div>
          <DeliveryInput
            placeholder="Cidade"
            value={form.cidade}
            onChange={e => onChange('cidade', e.target.value)}
            autoComplete="address-level2"
          />
        </>
      ) : null}

      {!loadingMeios && meiosPagamento.length > 0 ? (
        <div>
          <label className="delivery-text-secondary mb-1 block text-sm">
            Forma de pagamento (opcional)
          </label>
          <DeliverySelect
            value={form.meioPagamentoId}
            onChange={e => onChange('meioPagamentoId', e.target.value)}
          >
            <option value="">Selecionar na entrega</option>
            {meiosPagamento.map(m => (
              <option key={m.id} value={m.id}>
                {m.nome} — {m.formaPagamentoFiscalLabel}
              </option>
            ))}
          </DeliverySelect>
        </div>
      ) : null}
    </DeliveryCard>
  )
}
