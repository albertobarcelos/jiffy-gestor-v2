import type { EnderecoFormPublico } from '@/src/application/dto/delivery-publico/CheckoutPublicoFormDTO'
import { toLocaleUppercasePt } from '@/src/shared/utils/localeUppercase'
import type { EnderecoGeocodeInput } from '@/src/shared/utils/geolocalizacaoEnderecoShared'

/** Maiúsculas pt-BR durante digitação (sem trim). */
export function maiusculasEnderecoInput(valor: string): string {
  return toLocaleUppercasePt(valor)
}

export function normalizarEstadoEndereco(estado: string): string {
  return toLocaleUppercasePt(estado).slice(0, 2)
}

export function normalizarEnderecoFormPublico(form: EnderecoFormPublico): EnderecoFormPublico {
  return {
    ...form,
    rua: toLocaleUppercasePt(form.rua.trim()),
    numero: toLocaleUppercasePt(form.numero.trim()),
    bairro: toLocaleUppercasePt(form.bairro.trim()),
    cidade: toLocaleUppercasePt(form.cidade.trim()),
    estado: normalizarEstadoEndereco(form.estado.trim()),
    complemento: form.complemento?.trim()
      ? toLocaleUppercasePt(form.complemento.trim())
      : form.complemento,
    pontoReferencia: form.pontoReferencia?.trim()
      ? toLocaleUppercasePt(form.pontoReferencia.trim())
      : form.pontoReferencia,
  }
}

export function normalizarEnderecoGeocodeInput(input: EnderecoGeocodeInput): EnderecoGeocodeInput {
  return {
    ...input,
    rua: toLocaleUppercasePt(input.rua),
    numero: toLocaleUppercasePt(input.numero),
    bairro: toLocaleUppercasePt(input.bairro ?? ''),
    cidade: toLocaleUppercasePt(input.cidade ?? ''),
    estado: normalizarEstadoEndereco(input.estado ?? ''),
    complemento: input.complemento ? toLocaleUppercasePt(input.complemento) : input.complemento,
  }
}
