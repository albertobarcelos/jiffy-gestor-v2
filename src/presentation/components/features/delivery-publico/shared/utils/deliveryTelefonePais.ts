import { formatarTelefoneBr, extrairDigitosTelefone } from '@/src/shared/utils/telefoneBr'
import {
  DELIVERY_PAIS_TELEFONE_PADRAO,
  findDeliveryPaisTelefone,
  type DeliveryPaisTelefone,
} from '../constants/deliveryPaisesTelefone'

export function extrairDigitosNacionais(valor: string, pais: DeliveryPaisTelefone): string {
  const digits = valor.replace(/\D/g, '')
  return digits.slice(0, pais.nationalMax)
}

export function formatarTelefonePorPais(valor: string, iso2: string): string {
  const pais = findDeliveryPaisTelefone(iso2)
  if (pais.mascara === 'br') {
    return formatarTelefoneBr(valor)
  }

  const digits = extrairDigitosNacionais(valor, pais)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`
  if (digits.length <= 10) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
  }
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)} ${digits.slice(10)}`
}

/**
 * Digitos enviados à API.
 * BR mantém o formato nacional (DDD+número) já usado no cadastro.
 * Demais países: DDI + número nacional.
 */
export function comporTelefoneApi(nacionalFormatado: string, iso2: string): string {
  const pais = findDeliveryPaisTelefone(iso2 || DELIVERY_PAIS_TELEFONE_PADRAO)
  const nacional = extrairDigitosNacionais(nacionalFormatado, pais)

  if (pais.iso2 === 'BR') {
    return extrairDigitosTelefone(nacional)
  }

  return `${pais.ddi}${nacional}`
}

export function telefoneNacionalValido(nacionalFormatado: string, iso2: string): boolean {
  const pais = findDeliveryPaisTelefone(iso2 || DELIVERY_PAIS_TELEFONE_PADRAO)
  const nacional = extrairDigitosNacionais(nacionalFormatado, pais)
  return nacional.length >= pais.nationalMin && nacional.length <= pais.nationalMax
}

export function formatarTelefoneExibicao(nacionalFormatado: string, iso2: string): string {
  const pais = findDeliveryPaisTelefone(iso2 || DELIVERY_PAIS_TELEFONE_PADRAO)
  const nacional = formatarTelefonePorPais(nacionalFormatado, pais.iso2)
  if (!nacional) return ''
  if (pais.iso2 === 'BR') return nacional
  return `+${pais.ddi} ${nacional}`
}
