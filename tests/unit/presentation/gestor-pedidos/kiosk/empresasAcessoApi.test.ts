import { describe, expect, it } from 'vitest'
import {
  deveIrAoLoginPorSessao,
  mapEmpresaAcessoItem,
  parsePaginaEmpresasAcesso,
} from '@/src/presentation/gestor-pedidos/kiosk/empresasAcessoApi'

describe('empresasAcessoApi', () => {
  it('mapeia item da lista paginada e ignora inativa', () => {
    expect(
      mapEmpresaAcessoItem({
        id: 'a',
        nomeFantasia: 'Espetinho',
        cnpj: '30306231000199',
        bloqueado: false,
      })
    ).toEqual({
      id: 'a',
      nomeFantasia: 'Espetinho',
      cnpj: '30306231000199',
      bloqueado: false,
    })
    expect(mapEmpresaAcessoItem({ id: 'b', nomeFantasia: 'X', cnpj: '1', ativo: false })).toBeNull()
  })

  it('lê items, count e hasNext do backend', () => {
    const pagina = parsePaginaEmpresasAcesso({
      items: [{ id: 'a', nomeFantasia: 'A', cnpj: '00', bloqueado: false }],
      count: 25,
      hasNext: true,
    })
    expect(pagina.items).toHaveLength(1)
    expect(pagina.count).toBe(25)
    expect(pagina.hasNext).toBe(true)
  })

  it('token 401 ou mensagem de expirado manda ao login', () => {
    expect(deveIrAoLoginPorSessao(401, 'qualquer')).toBe(true)
    expect(deveIrAoLoginPorSessao(403, 'Token inválido ou expirado')).toBe(true)
    expect(deveIrAoLoginPorSessao(403, 'Empresa bloqueada')).toBe(false)
  })
})
