import { toLocaleUppercasePt } from '@/src/shared/utils/localeUppercase'
import type { EnderecoGeocodeInput } from '@/src/shared/utils/geolocalizacaoEnderecoShared'

/** Campos de endereço normalizáveis (gestor / formulários compartilhados). */
export type EnderecoFormTexto = {
  rua: string
  numero: string
  bairro: string
  cidade: string
  estado: string
  cep?: string
  complemento?: string
  pontoReferencia?: string
  etiqueta?: 'casa' | 'trabalho' | 'outro'
}

/** Maiúsculas pt-BR durante digitação (sem trim). */
export function maiusculasEnderecoInput(valor: string): string {
  return toLocaleUppercasePt(valor)
}

/**
 * Título visual (primeira letra de cada palavra em maiúscula).
 * Só para exibição no campo de busca do Google — formulário continua em maiúsculas.
 */
export function tituloCasePalavrasEndereco(valor: string): string {
  return valor.replace(/\S+/gu, palavra => {
    const primeira = palavra.charAt(0).toLocaleUpperCase('pt-BR')
    const resto = palavra.slice(1).toLocaleLowerCase('pt-BR')
    return `${primeira}${resto}`
  })
}

export function normalizarEstadoEndereco(estado: string): string {
  return toLocaleUppercasePt(estado).slice(0, 2)
}

export function normalizarEnderecoFormTexto(form: EnderecoFormTexto): EnderecoFormTexto {
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

/** @deprecated Use normalizarEnderecoFormTexto */
export const normalizarEnderecoFormPublico = normalizarEnderecoFormTexto

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
