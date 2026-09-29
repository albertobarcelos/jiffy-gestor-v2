import { describe, expect, it } from 'vitest'
import { Marketplace } from '@/src/domain/integracoes/Marketplace'
import { MerchantIdOd } from '@/src/domain/integracoes/MerchantIdOd'
import { SolicitacaoConexaoMarketplace } from '@/src/domain/integracoes/SolicitacaoConexaoMarketplace'
import { IntegracaoMarketplaceError } from '@/src/domain/integracoes/errors/IntegracaoMarketplaceError'

describe('Marketplace', () => {
  it('aceita canais do catálogo, independente de caixa', () => {
    expect(Marketplace.criar('aiqfome')?.codigo).toBe('AIQFOME')
    expect(Marketplace.criar('AIQFOME')?.codigo).toBe('AIQFOME')
  })

  it('recusa canal desconhecido', () => {
    expect(Marketplace.criar('IFOOD')).toBeNull()
    expect(Marketplace.criar('')).toBeNull()
  })
})

describe('MerchantIdOd', () => {
  it('aceita o ID informado pelo lojista', () => {
    expect(MerchantIdOd.criar('  12345  ')?.valor).toBe('12345')
    expect(MerchantIdOd.criar('loja-99')?.valor).toBe('loja-99')
  })

  it('recusa vazio e caracteres estranhos', () => {
    expect(MerchantIdOd.criar('')).toBeNull()
    expect(MerchantIdOd.criar('id da loja')).toBeNull()
    expect(MerchantIdOd.criar('<script>')).toBeNull()
  })
})

describe('SolicitacaoConexaoMarketplace', () => {
  it('monta o pedido da empresa aberta sem conhecer o hub', () => {
    const pedido = SolicitacaoConexaoMarketplace.criar({
      empresaId: 'emp-1',
      marketplace: 'AIQFOME',
      merchantIdOd: '9988',
    })
    expect(pedido.empresaId).toBe('emp-1')
    expect(pedido.marketplace.codigo).toBe('AIQFOME')
    expect(pedido.merchantIdOd.valor).toBe('9988')
  })

  it('bloqueia empresa, marketplace ou ID inválidos', () => {
    expect(() =>
      SolicitacaoConexaoMarketplace.criar({
        empresaId: '  ',
        marketplace: 'AIQFOME',
        merchantIdOd: '1',
      })
    ).toThrow(IntegracaoMarketplaceError)

    try {
      SolicitacaoConexaoMarketplace.criar({
        empresaId: 'emp-1',
        marketplace: 'IFOOD',
        merchantIdOd: '1',
      })
      throw new Error('esperava marketplace inválido')
    } catch (error) {
      expect(error).toMatchObject({ code: 'INTEGRACAO_MARKETPLACE_INVALIDO', status: 400 })
    }
  })
})
