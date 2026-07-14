'use client'

import type { MeioPagamentoPublicoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { formatarTelefoneBr } from '@/src/shared/utils/telefoneBr'
import type { CheckoutFormData } from '../../shared/utils/montarPedidoPublico'
import type { ClienteLookupState } from '../../shared/hooks/useDeliveryCheckout'
import { DeliveryInput, DeliverySelect } from '../../shared/components/DeliveryInput'
import { DeliveryTipoEntregaToggle } from '../../shared/components/DeliveryTipoEntregaToggle'

type DeliveryCheckoutFormProps = {
  form: CheckoutFormData
  clienteLookup: ClienteLookupState
  meiosPagamento: MeioPagamentoPublicoDTO[]
  loadingMeios: boolean
  onChange: <K extends keyof CheckoutFormData>(key: K, value: CheckoutFormData[K]) => void
  onSelecionarEnderecoExistente: (enderecoId: string) => void
  onUsarNovoEndereco: () => void
  onTelefoneBlur: () => void
}

export function DeliveryCheckoutForm({
  form,
  clienteLookup,
  meiosPagamento,
  loadingMeios,
  onChange,
  onSelecionarEnderecoExistente,
  onUsarNovoEndereco,
  onTelefoneBlur,
}: DeliveryCheckoutFormProps) {
  const enderecos = clienteLookup.cliente?.enderecos ?? []
  const temEnderecosCadastrados = enderecos.length > 0
  // Não depende de status === 'encontrado': em loading a lista não pode sumir
  // (senão o formulário de novo endereço "pisca" aberto e fecha ao voltar).
  const mostrarSelecaoEnderecos =
    form.tipoEntrega === 'entrega' && temEnderecosCadastrados
  const mostrarCamposNovoEndereco =
    form.tipoEntrega === 'entrega' &&
    (!temEnderecosCadastrados || form.modoEndereco === 'novo')

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
        onBlur={onTelefoneBlur}
        inputMode="tel"
        autoComplete="tel"
        maxLength={15}
      />

      {form.tipoEntrega === 'entrega' && clienteLookup.status === 'loading' ? (
        <p className="text-xs" style={{ color: 'var(--delivery-primary)' }}>
          Verificando cadastro...
        </p>
      ) : null}

      {form.tipoEntrega === 'entrega' && clienteLookup.status === 'encontrado' ? (
        <p className="text-xs" style={{ color: 'var(--delivery-primary)' }}>
          {enderecos.length > 0
            ? 'Cliente encontrado. Escolha um endereço ou cadastre um novo.'
            : 'Cliente encontrado. Informe o endereço de entrega.'}
        </p>
      ) : null}

      {form.tipoEntrega === 'entrega' && clienteLookup.status === 'nao_encontrado' ? (
        <p className="text-xs" style={{ color: 'var(--delivery-primary)' }}>
          Novo cliente. Preencha os dados para cadastro.
        </p>
      ) : null}

      {clienteLookup.status === 'erro' && clienteLookup.mensagemErro ? (
        <p className="text-xs text-red-600">{clienteLookup.mensagemErro}</p>
      ) : null}

      <DeliveryInput
        variant="checkout"
        placeholder="Nome (opcional)"
        value={
          form.nome ||
          (clienteLookup.status === 'encontrado'
            ? clienteLookup.cliente?.nome ?? ''
            : '')
        }
        onChange={e => onChange('nome', e.target.value)}
        autoComplete="name"
      />

      {mostrarSelecaoEnderecos ? (
        <div className="space-y-2">
          <p
            className="text-sm font-medium"
            style={{ color: 'var(--delivery-primary)' }}
          >
            Endereço de entrega
          </p>
          <div className="space-y-2">
            {enderecos.map(endereco => {
              const selecionado =
                form.modoEndereco === 'existente' &&
                form.enderecoIdSelecionado === endereco.id
              return (
                <button
                  key={endereco.id}
                  type="button"
                  onMouseDown={e => {
                    e.preventDefault()
                  }}
                  onClick={() => onSelecionarEnderecoExistente(endereco.id)}
                  className="w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors"
                  style={{
                    borderColor: selecionado
                      ? 'var(--delivery-primary)'
                      : 'color-mix(in srgb, var(--delivery-primary) 22%, transparent)',
                    backgroundColor: selecionado
                      ? 'color-mix(in srgb, var(--delivery-primary) 8%, white)'
                      : '#ffffff',
                    color: 'var(--delivery-primary)',
                  }}
                >
                  <span className="block font-medium capitalize">
                    {endereco.etiqueta || 'Endereço'}
                  </span>
                  <span className="block opacity-80">
                    {[
                      endereco.rua,
                      endereco.numero ? `nº ${endereco.numero}` : '',
                      endereco.bairro,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                  {endereco.cidade || endereco.estado ? (
                    <span className="mt-0.5 block opacity-80">
                      {[endereco.cidade, endereco.estado].filter(Boolean).join('/')}
                    </span>
                  ) : null}
                </button>
              )
            })}
            <button
              type="button"
              onMouseDown={e => {
                // Evita blur do telefone antes do click (que re-dispara lookup e fecha o form).
                e.preventDefault()
              }}
              onClick={onUsarNovoEndereco}
              className="w-full rounded-lg border border-dashed px-3 py-2.5 text-left text-sm font-medium"
              style={{
                borderColor:
                  form.modoEndereco === 'novo'
                    ? 'var(--delivery-primary)'
                    : 'color-mix(in srgb, var(--delivery-primary) 35%, transparent)',
                backgroundColor:
                  form.modoEndereco === 'novo'
                    ? 'color-mix(in srgb, var(--delivery-primary) 8%, white)'
                    : '#ffffff',
                color: 'var(--delivery-primary)',
              }}
            >
              Usar novo endereço
            </button>
          </div>
        </div>
      ) : null}

      {mostrarCamposNovoEndereco ? (
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
          <div className="grid grid-cols-2 gap-2">
            <DeliveryInput
              variant="checkout"
              placeholder="Cidade"
              value={form.cidade}
              onChange={e => onChange('cidade', e.target.value)}
              autoComplete="address-level2"
            />
            <DeliveryInput
              variant="checkout"
              placeholder="UF"
              value={form.estado}
              onChange={e =>
                onChange('estado', e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2))
              }
              autoComplete="address-level1"
              maxLength={2}
              inputMode="text"
            />
          </div>
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
