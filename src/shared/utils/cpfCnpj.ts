export type TipoDocumento = 'cpf' | 'cnpj' | 'parcial' | 'vazio'
export type ModoDocumentoApi = 'criar' | 'editar'

/** Extrai apenas dígitos do documento, limitado a 14 (CNPJ). */
export function extrairDigitosDocumento(value: string): string {
  return String(value ?? '').replace(/\D/g, '').slice(0, 14)
}

function formatarCpfParcial(digits: string): string {
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`
}

function formatarCnpjParcial(digits: string): string {
  if (digits.length <= 2) return digits
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`
  if (digits.length <= 8) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`
  }
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`
}

/** Máscara progressiva: até 11 dígitos como CPF; 12–14 como CNPJ. */
export function formatarCpfCnpjInput(value: string): string {
  const digits = extrairDigitosDocumento(value)
  if (!digits) return ''
  if (digits.length <= 11) return formatarCpfParcial(digits)
  return formatarCnpjParcial(digits)
}

export function detectarTipoDocumento(digits: string): TipoDocumento {
  const d = extrairDigitosDocumento(digits)
  if (!d) return 'vazio'
  if (d.length === 11) return 'cpf'
  if (d.length === 14) return 'cnpj'
  return 'parcial'
}

/** Documento com dígitos mas sem 11 ou 14 completos. */
export function documentoParcialInvalido(value: string): boolean {
  const digits = extrairDigitosDocumento(value)
  if (!digits) return false
  return digits.length !== 11 && digits.length !== 14
}

/**
 * Separa o valor unificado nos campos da API (`cpf` / `cnpj`).
 * Na edição, string vazia no campo oposto limpa o valor no backend.
 */
export function mapearDocumentoParaApi(
  value: string,
  modo: ModoDocumentoApi
): { cpf?: string | null; cnpj?: string | null } {
  const digits = extrairDigitosDocumento(value)

  if (!digits) {
    if (modo === 'editar') return { cpf: '', cnpj: '' }
    return {}
  }

  if (digits.length === 11) {
    if (modo === 'editar') return { cpf: digits, cnpj: '' }
    return { cpf: digits }
  }

  if (digits.length === 14) {
    if (modo === 'editar') return { cnpj: digits, cpf: '' }
    return { cnpj: digits }
  }

  return {}
}

/** Formata CPF ou CNPJ completo para exibição (lista, detalhe). */
export function formatarCpfCnpjExibicao(valor: string | null | undefined): string {
  const digits = extrairDigitosDocumento(String(valor ?? ''))
  if (!digits) return ''
  return formatarCpfCnpjInput(digits)
}

/** Exibe CPF ou CNPJ do cliente (mutuamente exclusivos na API). */
export function documentoClienteExibicao(
  cpf: string | null | undefined,
  cnpj: string | null | undefined,
  vazio = '-'
): string {
  const raw = (cpf?.trim() || cnpj?.trim() || '').trim()
  if (!raw) return vazio
  const formatado = formatarCpfCnpjExibicao(raw)
  return formatado || vazio
}
