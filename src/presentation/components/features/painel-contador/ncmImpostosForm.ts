import {
  isCstIcmsBeneficio,
  normalizarCodigoCbenefParaValidacao,
  normalizarCstIcms,
} from '@/src/domain/entities/painel-contador/cbenefRegras'
import type { ConfiguracaoImpostoNcm } from './configuracaoImpostoNcm'

export interface NcmImpostosFormData {
  ncm: string
  cfop: string
  csosn: string
  icmsCst: string
  icmsAliquota: string
  icmsReducaoBase: string
  codigoBeneficioFiscal: string
  pisCst: string
  pisAliquota: string
  cofinsCst: string
  cofinsAliquota: string
}

export const NCM_IMPOSTOS_FORM_VAZIO: NcmImpostosFormData = {
  ncm: '',
  cfop: '',
  csosn: '',
  icmsCst: '',
  icmsAliquota: '',
  icmsReducaoBase: '',
  codigoBeneficioFiscal: '',
  pisCst: '',
  pisAliquota: '',
  cofinsCst: '',
  cofinsAliquota: '',
}

export function ncmImpostosFormFromConfig(
  config: ConfiguracaoImpostoNcm | null | undefined
): NcmImpostosFormData {
  if (!config) return { ...NCM_IMPOSTOS_FORM_VAZIO }
  return {
    ncm: config.ncm?.codigo || '',
    cfop: config.cfop || '',
    csosn: config.csosn || '',
    icmsCst: config.icms?.cst || '',
    icmsAliquota: config.icms?.aliquota?.toString() || '',
    icmsReducaoBase: config.icms?.reducaoBase?.toString() || '',
    codigoBeneficioFiscal: config.codigoBeneficioFiscal || '',
    pisCst: config.pis?.cst || '',
    pisAliquota: config.pis?.aliquota?.toString() || '',
    cofinsCst: config.cofins?.cst || '',
    cofinsAliquota: config.cofins?.aliquota?.toString() || '',
  }
}

export function ncmImpostosFormToPayload(
  form: NcmImpostosFormData,
  isSimplesNacional: boolean
) {
  const cstIcms = normalizarCstIcms(form.icmsCst)
  return {
    cfop: form.cfop || undefined,
    csosn: isSimplesNacional ? form.csosn || undefined : undefined,
    codigoBeneficioFiscal:
      !isSimplesNacional && isCstIcmsBeneficio(cstIcms)
        ? form.codigoBeneficioFiscal
          ? normalizarCodigoCbenefParaValidacao(form.codigoBeneficioFiscal)
          : null
        : null,
    icms: {
      origem: 0,
      cst: isSimplesNacional ? undefined : form.icmsCst || undefined,
      aliquota: form.icmsAliquota ? parseFloat(form.icmsAliquota) : undefined,
      reducaoBase:
        !isSimplesNacional && cstIcms === '20' && form.icmsReducaoBase
          ? parseFloat(form.icmsReducaoBase)
          : undefined,
    },
    pis: {
      cst: form.pisCst || undefined,
      aliquota: form.pisAliquota ? parseFloat(form.pisAliquota) : undefined,
    },
    cofins: {
      cst: form.cofinsCst || undefined,
      aliquota: form.cofinsAliquota ? parseFloat(form.cofinsAliquota) : undefined,
    },
  }
}
