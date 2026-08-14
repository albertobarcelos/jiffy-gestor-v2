import { describe, it, expect } from 'vitest'
import {
  codigoCbenefTemTamanhoValido,
  deveAlertarCbenefAusente,
  identificarItensSemCbenef,
  isCstIcmsNaoSuportado,
  isLiteralSemCbenef,
  mascaraCodigoCbenef,
  normalizarCodigoCbenefParaValidacao,
} from '@/src/domain/entities/painel-contador/cbenefRegras'
import { SalvarNcmImpostosSchema } from '@/src/application/dto/painel-contador/PainelContadorDTO'

describe('cbenefRegras', () => {
  it('não alerta no Simples Nacional', () => {
    expect(
      deveAlertarCbenefAusente({
        crt: 1,
        uf: 'SP',
        cst: '40',
        codigoBeneficioFiscal: '',
      })
    ).toBe(false)
  })

  it('alerta em SP + CRT 3 + CST de benefício sem cBenef', () => {
    expect(
      deveAlertarCbenefAusente({
        crt: 3,
        uf: 'SP',
        cst: '40',
        codigoBeneficioFiscal: '',
      })
    ).toBe(true)
  })

  it('não alerta em UF que não é SP', () => {
    expect(
      deveAlertarCbenefAusente({
        crt: 3,
        uf: 'RJ',
        cst: '40',
        codigoBeneficioFiscal: '',
      })
    ).toBe(false)
  })

  it('lista produtos sem cBenef uma vez por NCM+nome', () => {
    const itens = identificarItensSemCbenef({
      crt: 3,
      uf: 'SP',
      itens: [
        { nome: 'Refrigerante', ncm: '22021000' },
        { nome: 'Refrigerante', ncm: '22021000' },
        { nome: 'Pão', ncm: '19059090' },
      ],
      configsPorNcm: new Map([
        ['22021000', { codigo: '22021000', cstIcms: '40' }],
        ['19059090', { codigo: '19059090', cstIcms: '00', codigoBeneficioFiscal: 'SP070060' }],
      ]),
    })
    expect(itens).toEqual([{ nome: 'Refrigerante', ncm: '22021000' }])
  })

  it('reconhece CST 10/30/70 como não suportados', () => {
    expect(isCstIcmsNaoSuportado('10')).toBe(true)
    expect(isCstIcmsNaoSuportado('30')).toBe(true)
    expect(isCstIcmsNaoSuportado('70')).toBe(true)
    expect(isCstIcmsNaoSuportado('20')).toBe(false)
  })

  it('normaliza máscara cBenef para 8 ou 10 caracteres', () => {
    expect(mascaraCodigoCbenef('sp070060')).toBe('SP070060')
    expect(mascaraCodigoCbenef('sp-07 0060')).toBe('SP070060')
  })

  it('preserva a literal SEM CBENEF na validação', () => {
    expect(isLiteralSemCbenef('sem cbenef')).toBe(true)
    expect(normalizarCodigoCbenefParaValidacao('sem  cbenef')).toBe('SEM CBENEF')
    expect(codigoCbenefTemTamanhoValido('SEM CBENEF')).toBe(true)
    expect(mascaraCodigoCbenef('SEM CBENEF')).toBe('SEMCBENEF')
  })
})

describe('SalvarNcmImpostosSchema', () => {
  it('exige reducaoBase quando CST é 20', () => {
    const parsed = SalvarNcmImpostosSchema.safeParse({
      icms: { cst: '20', aliquota: 18 },
    })
    expect(parsed.success).toBe(false)
  })

  it('aceita CST 20 com reducaoBase', () => {
    const parsed = SalvarNcmImpostosSchema.safeParse({
      icms: { cst: '20', aliquota: 18, reducaoBase: 33.33 },
    })
    expect(parsed.success).toBe(true)
  })

  it('rejeita CST 10/30/70', () => {
    const parsed = SalvarNcmImpostosSchema.safeParse({
      icms: { cst: '10', aliquota: 18 },
    })
    expect(parsed.success).toBe(false)
  })

  it('aceita codigoBeneficioFiscal opcional', () => {
    const parsed = SalvarNcmImpostosSchema.safeParse({
      codigoBeneficioFiscal: 'SP070060',
      icms: { cst: '40', aliquota: 0 },
    })
    expect(parsed.success).toBe(true)
  })

  it('aceita a literal SEM CBENEF', () => {
    const parsed = SalvarNcmImpostosSchema.safeParse({
      codigoBeneficioFiscal: 'sem cbenef',
      icms: { cst: '40', aliquota: 0 },
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.codigoBeneficioFiscal).toBe('SEM CBENEF')
    }
  })
})
