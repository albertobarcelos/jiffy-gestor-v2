import { formatarCepMascara, normalizarDigitosCep } from '@/src/shared/utils/consultaCep'
import { maiusculasEnderecoInput } from '@/src/shared/utils/normalizarTextoEnderecoPublico'

/**
 * Modo de digitação do campo de busca Places (endereço / CEP).
 * Decidido pelo primeiro caractere significativo; limpar o campo reinicia.
 */
export type ModoMascaraBuscaEnderecoPlaces = 'vazio' | 'cep' | 'livre'

/**
 * Se a digitação começa com número → CEP (máscara).
 * Se começa com letra (ou outro não-dígito) → texto livre, mesmo com dígitos no meio.
 */
export function resolverModoMascaraBuscaEnderecoPlaces(
  valor: string
): ModoMascaraBuscaEnderecoPlaces {
  const primeiro = valor.trimStart().match(/./u)?.[0]
  if (!primeiro) return 'vazio'
  if (/\d/u.test(primeiro)) return 'cep'
  return 'livre'
}

export type FormatBuscaEnderecoPlacesOptions = {
  /** Delivery público aplica maiúsculas no modo livre. */
  upperCaseLivre?: boolean
}

/**
 * Formata o valor exibido no campo de busca Places conforme o modo derivado do texto.
 */
export function formatarBuscaEnderecoPlacesInput(
  valor: string,
  options: FormatBuscaEnderecoPlacesOptions = {}
): string {
  const modo = resolverModoMascaraBuscaEnderecoPlaces(valor)
  if (modo === 'vazio') return ''
  if (modo === 'cep') return formatarCepMascara(valor)
  return options.upperCaseLivre ? maiusculasEnderecoInput(valor) : valor
}

/** Dígitos do CEP quando o campo está em modo CEP (vazio caso contrário). */
export function digitosCepDaBuscaEnderecoPlaces(valor: string): string {
  if (resolverModoMascaraBuscaEnderecoPlaces(valor) !== 'cep') return ''
  return normalizarDigitosCep(valor)
}
