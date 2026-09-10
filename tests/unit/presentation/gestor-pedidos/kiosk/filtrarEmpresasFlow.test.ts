import { describe, expect, it } from 'vitest'
import type { LoginEmpresaSnapshot } from '@/src/domain/types/LoginEmpresaSnapshot'
import {
  deveCarregarMaisEmpresasFlow,
  empresaFlowCorrespondeBusca,
  fatiarEmpresasFlow,
  filtrarEmpresasFlow,
  PAGE_SIZE_EMPRESAS_FLOW,
} from '@/src/presentation/gestor-pedidos/kiosk/filtrarEmpresasFlow'

const emp = (id: string, nome: string, cnpj = '00000000000000'): LoginEmpresaSnapshot => ({
  id,
  nomeFantasia: nome,
  cnpj,
  bloqueado: false,
})

describe('filtrarEmpresasFlow', () => {
  it('filtra por nome e por CNPJ', () => {
    const lista = [
      emp('a', 'Larikao Lanches', '43697595000199'),
      emp('b', 'Duo Cafe', '11222333000144'),
    ]
    expect(empresaFlowCorrespondeBusca(lista[0], 'lari')).toBe(true)
    expect(empresaFlowCorrespondeBusca(lista[0], '43697')).toBe(true)
    expect(empresaFlowCorrespondeBusca(lista[0], 'duo')).toBe(false)
    expect(filtrarEmpresasFlow(lista, 'duo', null).map(e => e.id)).toEqual(['b'])
  })

  it('coloca a última empresa no topo', () => {
    const lista = [emp('a', 'A'), emp('b', 'B'), emp('c', 'C')]
    expect(filtrarEmpresasFlow(lista, '', 'b').map(e => e.id)).toEqual(['b', 'a', 'c'])
  })

  it('fatia de 10 em 10', () => {
    expect(PAGE_SIZE_EMPRESAS_FLOW).toBe(10)
    const lista = Array.from({ length: 25 }, (_, i) => emp(String(i), `E${i}`))
    expect(fatiarEmpresasFlow(lista, 10)).toHaveLength(10)
    expect(fatiarEmpresasFlow(lista, 20)).toHaveLength(20)
  })

  it('carrega mais no fim do scroll ou se a lista ainda não enche o painel', () => {
    expect(
      deveCarregarMaisEmpresasFlow({
        scrollTop: 0,
        clientHeight: 600,
        scrollHeight: 400,
        temMais: true,
      })
    ).toBe(true)
    expect(
      deveCarregarMaisEmpresasFlow({
        scrollTop: 500,
        clientHeight: 400,
        scrollHeight: 900,
        temMais: true,
      })
    ).toBe(true)
    expect(
      deveCarregarMaisEmpresasFlow({
        scrollTop: 0,
        clientHeight: 400,
        scrollHeight: 900,
        temMais: true,
      })
    ).toBe(false)
    expect(
      deveCarregarMaisEmpresasFlow({
        scrollTop: 500,
        clientHeight: 400,
        scrollHeight: 900,
        temMais: false,
      })
    ).toBe(false)
  })
})
