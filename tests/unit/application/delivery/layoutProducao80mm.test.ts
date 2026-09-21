import { describe, expect, it } from 'vitest'
import {
  identidadePrimariaEhTipoAvulso,
  linhaComplementoProducao,
  linhaItemProducao,
  montarModeloProducao80mm,
  recuoComplementoEspacos,
  textosIdentidadeProducao,
  textoPilulaSenha,
} from '@/src/application/delivery/layoutProducao80mm'

describe('layoutProducao80mm', () => {
  it('formata item em maiúsculas com quantidade inteira', () => {
    expect(linhaItemProducao(2.0, 'X-Búrger')).toBe('2x X-BURGER')
    expect(linhaItemProducao(0, 'X-Burger')).toBe('0x X-BURGER (item ja lancado)')
  })

  it('recua complemento na proporção 32/24', () => {
    expect(recuoComplementoEspacos(2)).toBe('    ')
    expect(recuoComplementoEspacos(10)).toBe('     ')
    expect(
      linhaComplementoProducao({
        recuo: recuoComplementoEspacos(2),
        nome: 'Queijo',
        quantidade: 1,
        impacto: 'aumenta',
      })
    ).toBe('    + 1 QUEIJO')
    expect(
      linhaComplementoProducao({
        recuo: recuoComplementoEspacos(2),
        nome: 'Molho',
        quantidade: 1,
        impacto: 'nenhum',
      })
    ).toBe('    * 1 MOLHO')
  })

  it('parte identidade longa em duas pílulas', () => {
    const curta = textosIdentidadeProducao({
      tipoVenda: 'balcao',
      codigoVenda: '1842',
      identificacao: 'JOAO',
    })
    expect(curta.primaria).toBe('BALCAO #1842 | JOAO')
    expect(curta.secundaria).toBeNull()

    const longa = textosIdentidadeProducao({
      tipoVenda: 'balcao',
      codigoVenda: '1842',
      identificacao: 'JOAO DA SILVA COSTA',
    })
    expect(longa.primaria).toBe('BALCAO #1842')
    expect(longa.secundaria).toBe('JOAO DA SILVA COSTA')

    const enche = textosIdentidadeProducao({
      tipoVenda: 'balcao',
      codigoVenda: '1842',
      identificacao: 'MARIA DA CONCEICAO OLIVEIRA SANTOS PEREIRA',
    })
    expect(enche.primaria).toBe('BALCAO #1842')
    expect(enche.secundaria).toBe('MARIA DA CONCEICAO')
    expect((enche.secundaria ?? '').length).toBeLessThanOrEqual(26)
  })

  it('omite o codigo da identidade na via unitaria', () => {
    const id = textosIdentidadeProducao({
      tipoVenda: 'entrega',
      codigoVenda: '1842',
      viaUnitaria: true,
    })
    expect(id.primaria).toBe('ENTREGA')
  })

  it('identidade com código usa destaque; tipo sozinho não', () => {
    expect(identidadePrimariaEhTipoAvulso('ENTREGA')).toBe(true)
    expect(identidadePrimariaEhTipoAvulso('ENTREGA #1842')).toBe(false)
    expect(identidadePrimariaEhTipoAvulso('MESA 12')).toBe(false)
  })

  it('pílula por unidade é o código, sem a palavra PEDIDO', () => {
    const modelo = montarModeloProducao80mm({
      tipoVenda: 'entrega',
      codigoVenda: '1842',
      via: { kind: 'unit', unitIndex: 2, unitTotal: 5 },
    })
    expect(modelo.unidade).toBe('#1842 - 2 DE 5')
    expect(modelo.identidade.primaria).toBe('ENTREGA')
  })

  it('espaça os dígitos da senha', () => {
    expect(textoPilulaSenha('017')).toBe('SENHA:  0 1 7')
  })

  it('monta o cupom de produção na ordem do print order', () => {
    const modelo = montarModeloProducao80mm({
      tipoVenda: 'entrega',
      codigoVenda: '1842',
      identificacao: 'JOAO',
      dataPedido: '2026-09-18T15:41:00-04:00',
      atendente: 'Carlos',
      observacaoPedido: 'Manda canudo',
      nomeImpressora: 'Cozinha',
      versao: '0.1.0',
      codigoTerminal: '7K2P',
      itens: [
        {
          nomeProduto: 'X-Burger',
          quantidade: 2,
          observacao: 'sem cebola',
          complementos: [
            { nome: 'Queijo', quantidade: 1, tipoImpactoPreco: 'aumenta' },
            { nome: 'Bacon', quantidade: 1, tipoImpactoPreco: 'aumenta' },
          ],
        },
        { nomeProduto: 'Coca Lata', quantidade: 1 },
      ],
    })
    expect(modelo.identidade.primaria).toBe('ENTREGA #1842 | JOAO')
    expect(modelo.itens[0]?.produto).toBe('2x X-BURGER')
    expect(modelo.itens[0]?.extras[0]).toBe('    + 1 QUEIJO')
    expect(modelo.itens[0]?.extras[2]).toBe('    Obs: sem cebola')
    expect(modelo.observacaoPedido).toBe('Manda canudo')
    expect(modelo.resumo).toContain('3 ITENS')
    expect(modelo.resumo).toContain('Cozinha')
    expect(modelo.resumo).toMatch(/15:41/)
    expect(modelo.resumo).toContain('Atend: Carlos')
    expect(modelo.rodape[0]).toContain('Venda #1842')
  })
})
