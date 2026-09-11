import type { CheckoutFormData } from '@/src/application/dto/delivery-publico/CheckoutPublicoFormDTO'
import type { DeliveryTipoEntrega } from '../../stores/deliveryPreferenciaEntregaStore'
import type { ClienteLookupState } from './types'

export const COTACAO_INVALIDATING_FORM_KEYS = new Set<keyof CheckoutFormData>([
  'tipoEntrega',
  'telefone',
  'telefonePaisIso2',
  'nome',
  'modoEndereco',
  'enderecoIdSelecionado',
  'rua',
  'numero',
  'bairro',
  'cidade',
  'estado',
  'cep',
  'complemento',
  'pontoReferencia',
  'etiquetaEndereco',
  'cpfNotaFiscal',
])

export const LOOKUP_DEBOUNCE_MS = 450
/** BR: celular completo = DDD + 9 dígitos. Backend só aceita 11. */
export const BR_CELULAR_DIGITOS = 11

export function createInitialForm(tipoEntrega: DeliveryTipoEntrega): CheckoutFormData {
  return {
    tipoEntrega,
    telefone: '',
    telefonePaisIso2: 'BR',
    nome: '',
    modoEndereco: 'novo',
    enderecoIdSelecionado: '',
    rua: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
    complemento: '',
    pontoReferencia: '',
    etiquetaEndereco: 'casa',
    apelidoEndereco: 'Casa',
    pagamentos: [],
    observacaoPedido: '',
    cpfNotaFiscal: '',
    modoTempo: 'imediato',
  }
}

export function createInitialLookup(): ClienteLookupState {
  return {
    status: 'idle',
    telefoneConsultado: null,
    cliente: null,
    mensagemErro: null,
  }
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

export function limparLookupEstadoIncompleto(
  setClienteLookup: (
    value: ClienteLookupState | ((prev: ClienteLookupState) => ClienteLookupState)
  ) => void,
  setForm: (value: CheckoutFormData | ((prev: CheckoutFormData) => CheckoutFormData)) => void,
  lookupSeqRef: { current: number },
  preferirNovoEnderecoRef: { current: boolean }
) {
  lookupSeqRef.current += 1
  preferirNovoEnderecoRef.current = false
  setClienteLookup(createInitialLookup())
  setForm(prev => ({
    ...prev,
    modoEndereco: 'novo',
    enderecoIdSelecionado: '',
  }))
}
