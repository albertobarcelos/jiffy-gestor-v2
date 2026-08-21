import { describe, it, expect } from 'vitest'
import {
  ncmImpostosFormFromConfig,
  ncmImpostosFormToPayload,
  NCM_IMPOSTOS_FORM_VAZIO,
} from '@/src/presentation/components/features/painel-contador/ncmImpostosForm'

describe('ncmImpostosForm', () => {
  it('hidrata o formulário a partir da configuração', () => {
    const form = ncmImpostosFormFromConfig({
      ncm: { codigo: '19052090', descricao: 'Pães' },
      cfop: '5102',
      codigoBeneficioFiscal: 'SP010020',
      icms: { cst: '40', aliquota: 4 },
    })
    expect(form.ncm).toBe('19052090')
    expect(form.codigoBeneficioFiscal).toBe('SP010020')
    expect(form.icmsCst).toBe('40')
    expect(form.icmsAliquota).toBe('4')
  })

  it('envia cBenef só em CST de benefício no regime normal', () => {
    const payload = ncmImpostosFormToPayload(
      {
        ...NCM_IMPOSTOS_FORM_VAZIO,
        ncm: '19052090',
        icmsCst: '40',
        icmsAliquota: '4',
        codigoBeneficioFiscal: 'sp010020',
      },
      false
    )
    expect(payload.codigoBeneficioFiscal).toBe('SP010020')
    expect(payload.icms.cst).toBe('40')
  })

  it('não envia cBenef no Simples Nacional', () => {
    const payload = ncmImpostosFormToPayload(
      {
        ...NCM_IMPOSTOS_FORM_VAZIO,
        csosn: '102',
        codigoBeneficioFiscal: 'SP010020',
      },
      true
    )
    expect(payload.codigoBeneficioFiscal).toBeNull()
    expect(payload.icms.cst).toBeUndefined()
    expect(payload.csosn).toBe('102')
  })

  it('inclui reducaoBase apenas no CST 20', () => {
    const payload = ncmImpostosFormToPayload(
      {
        ...NCM_IMPOSTOS_FORM_VAZIO,
        icmsCst: '20',
        icmsAliquota: '18',
        icmsReducaoBase: '33.33',
      },
      false
    )
    expect(payload.icms.reducaoBase).toBe(33.33)
  })
})
