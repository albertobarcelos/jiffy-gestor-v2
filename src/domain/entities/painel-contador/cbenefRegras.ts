export const CST_ICMS_BENEFICIO = ['20', '40', '41', '50', '51'] as const
export const CST_ICMS_NAO_SUPORTADO = ['10', '30', '70'] as const
export const UFS_CBENEF_ATIVO = ['DF', 'ES', 'GO', 'MT', 'PR', 'RJ', 'RS', 'SC', 'SP'] as const
export const UF_CBENEF_OBRIGATORIO = 'SP'
/** Literal aceita pelo fiscal (Swagger: GET /v1/configuracoes/cbenef/validar/{codigo}). */
export const LITERAL_SEM_CBENEF = 'SEM CBENEF'
export const MENSAGEM_CST_NAO_SUPORTADO =
  'CST 10, 30 e 70 ainda não são suportados. Entre em contato com o suporte.'

export type CstIcmsBeneficio = (typeof CST_ICMS_BENEFICIO)[number]
export type CstIcmsNaoSuportado = (typeof CST_ICMS_NAO_SUPORTADO)[number]

export function normalizarUf(uf: string | null | undefined): string {
  return (uf ?? '').trim().toUpperCase()
}

export function normalizarCstIcms(cst: string | null | undefined): string {
  const digits = (cst ?? '').replace(/\D/g, '')
  if (!digits) return ''
  return digits.padStart(2, '0').slice(-2)
}

export function isCstIcmsBeneficio(cst: string | null | undefined): boolean {
  return (CST_ICMS_BENEFICIO as readonly string[]).includes(normalizarCstIcms(cst))
}

export function isCstIcmsNaoSuportado(cst: string | null | undefined): boolean {
  return (CST_ICMS_NAO_SUPORTADO as readonly string[]).includes(normalizarCstIcms(cst))
}

export function ufTemCbenefAtivo(uf: string | null | undefined): boolean {
  return (UFS_CBENEF_ATIVO as readonly string[]).includes(normalizarUf(uf))
}

export function isRegimeNormal(crt: number | null | undefined): boolean {
  return crt === 3
}

export function deveExibirCampoCbenef(crt: number | null | undefined): boolean {
  return isRegimeNormal(crt)
}

export function deveAlertarCbenefAusente(params: {
  crt: number | null | undefined
  uf: string | null | undefined
  cst: string | null | undefined
  codigoBeneficioFiscal: string | null | undefined
}): boolean {
  if (!isRegimeNormal(params.crt)) return false
  if (normalizarUf(params.uf) !== UF_CBENEF_OBRIGATORIO) return false
  if (!isCstIcmsBeneficio(params.cst)) return false
  return !(params.codigoBeneficioFiscal ?? '').trim()
}

export interface ItemVendaCbenef {
  nome: string
  ncm: string
}

export interface ConfigNcmCbenef {
  codigo: string
  cstIcms?: string
  codigoBeneficioFiscal?: string
}

/**
 * Itens da venda em SP / Regime Normal com CST de benefício e sem cBenef no NCM.
 * Não alerta quando o NCM não tem CST de benefício configurado.
 */
export function identificarItensSemCbenef(params: {
  crt: number | null | undefined
  uf: string | null | undefined
  itens: ItemVendaCbenef[]
  configsPorNcm: Map<string, ConfigNcmCbenef>
}): ItemVendaCbenef[] {
  if (!isRegimeNormal(params.crt) || normalizarUf(params.uf) !== UF_CBENEF_OBRIGATORIO) {
    return []
  }

  const vistos = new Set<string>()
  const resultado: ItemVendaCbenef[] = []

  for (const item of params.itens) {
    const ncm = item.ncm.replace(/\D/g, '').slice(0, 8)
    if (ncm.length !== 8) continue

    const chave = `${ncm}:${item.nome}`
    if (vistos.has(chave)) continue

    const config = params.configsPorNcm.get(ncm)
    if (!config) continue

    if (
      deveAlertarCbenefAusente({
        crt: params.crt,
        uf: params.uf,
        cst: config.cstIcms,
        codigoBeneficioFiscal: config.codigoBeneficioFiscal,
      })
    ) {
      vistos.add(chave)
      resultado.push({ nome: item.nome, ncm })
    }
  }

  return resultado
}

export function mascaraCodigoCbenef(valor: string): string {
  return valor.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 10)
}

export function isLiteralSemCbenef(valor: string | null | undefined): boolean {
  return (valor ?? '').replace(/\s+/g, ' ').trim().toUpperCase() === LITERAL_SEM_CBENEF
}

/** Preserva a literal `SEM CBENEF`; demais códigos viram 8/10 alfanuméricos. */
export function normalizarCodigoCbenefParaValidacao(valor: string): string {
  if (isLiteralSemCbenef(valor)) return LITERAL_SEM_CBENEF
  return mascaraCodigoCbenef(valor)
}

export function codigoCbenefTemTamanhoValido(codigo: string): boolean {
  if (isLiteralSemCbenef(codigo)) return true
  const normalizado = mascaraCodigoCbenef(codigo)
  return normalizado.length === 8 || normalizado.length === 10
}
