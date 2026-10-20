import { describe, expect, it } from 'vitest'
import { Produto } from '@/src/domain/entities/Produto'
import { ncmCestDoBlocoFiscal } from '@/src/domain/policies/produto/ncmCestDoBlocoFiscal'
import { rotulosNcmCestFiscal } from '@/src/presentation/components/features/pedidos/components/PedidoNcmCestFiscalTexto'

describe('ncmCestDoBlocoFiscal', () => {
  it('lê só o bloco fiscal e ignora ncm/cest da raiz', () => {
    expect(
      ncmCestDoBlocoFiscal({
        ncm: '11111111',
        cest: '2222222',
        fiscal: { ncm: '21069090', cest: '1704900' },
      })
    ).toEqual({ ncm: '21069090', cest: '1704900' })
  })

  it('aceita dadosFiscais e fiscal por cima', () => {
    expect(
      ncmCestDoBlocoFiscal({
        dadosFiscais: { ncm: '12345678', cest: '1111111' },
        fiscal: { ncm: '21069090' },
      })
    ).toEqual({ ncm: '21069090', cest: '1111111' })
  })

  it('não usa ncm da raiz quando o fiscal está vazio', () => {
    expect(ncmCestDoBlocoFiscal({ ncm: '21069090', cest: '1704900' })).toEqual({
      ncm: '',
      cest: '',
    })
  })

  it('desembrulha payload { data }', () => {
    expect(
      ncmCestDoBlocoFiscal({
        data: { id: 'p1', fiscal: { ncm: '21069090', cest: '1704900' } },
      })
    ).toEqual({ ncm: '21069090', cest: '1704900' })
  })
})

describe('rotulosNcmCestFiscal', () => {
  it('mostra o código quando o fiscal tem valor', () => {
    expect(
      rotulosNcmCestFiscal({ ncm: '21069090', cest: '0301300', indisponivel: false }, false)
    ).toEqual({
      ncm: '21069090',
      cest: '0301300',
      ncmVazio: false,
      cestVazio: false,
      indisponivel: false,
    })
  })

  it('mostra SEM NCM e SEM CEST quando o fiscal não tem código', () => {
    expect(rotulosNcmCestFiscal({ ncm: '', cest: '', indisponivel: false }, false)).toEqual({
      ncm: 'SEM NCM',
      cest: 'SEM CEST',
      ncmVazio: true,
      cestVazio: true,
      indisponivel: false,
    })
  })

  it('não confunde falha do GET com produto sem código', () => {
    expect(rotulosNcmCestFiscal({ ncm: '', cest: '', indisponivel: true }, false)).toEqual({
      ncm: '—',
      cest: '—',
      ncmVazio: true,
      cestVazio: true,
      indisponivel: true,
    })
  })
})

describe('Produto.fromJSON — fiscal', () => {
  it('não lê ncm/cest da raiz', () => {
    const produto = Produto.fromJSON({
      id: 'p1',
      codigoProduto: 'p1',
      nome: 'X',
      valor: 10,
      ativo: true,
      ncm: '21069090',
      cest: '0301300',
    })
    expect(produto.getNcm()).toBe('')
    expect(produto.getCest()).toBe('')
  })

  it('lê só o bloco fiscal', () => {
    const produto = Produto.fromJSON({
      id: 'p1',
      codigoProduto: 'p1',
      nome: 'X',
      valor: 10,
      ativo: true,
      ncm: '11111111',
      fiscal: { ncm: '21069090', cest: '0301300' },
    })
    expect(produto.getNcm()).toBe('21069090')
    expect(produto.getCest()).toBe('0301300')
  })
})
