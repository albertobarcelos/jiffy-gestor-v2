import { describe, expect, it } from 'vitest'
import {
  devePriorizarImagemProduto,
  deveUsarOtimizadorImagem,
  isDeliveryPublicoImageHost,
  PRIMEIRAS_IMAGENS_PRIORITY,
} from '@/src/presentation/components/features/delivery-publico/shared/media/deliveryPublicoImageHosts'

describe('deliveryPublicoImageHosts', () => {
  it('reconhece S3, CloudFront e R2', () => {
    expect(isDeliveryPublicoImageHost('bucket.s3.sa-east-1.amazonaws.com')).toBe(true)
    expect(isDeliveryPublicoImageHost('d111111abcdef8.cloudfront.net')).toBe(true)
    expect(isDeliveryPublicoImageHost('pub-abc.r2.dev')).toBe(true)
    expect(isDeliveryPublicoImageHost('cdn.loja-terceira.com')).toBe(false)
  })

  it('otimiza so URL http(s) do storage conhecido', () => {
    expect(
      deveUsarOtimizadorImagem('https://midia.s3.amazonaws.com/tenant/foto.jpg')
    ).toBe(true)
    expect(deveUsarOtimizadorImagem('/assets/local.jpg')).toBe(true)
    expect(deveUsarOtimizadorImagem('https://cdn.desconhecido.com/foto.jpg')).toBe(false)
    expect(deveUsarOtimizadorImagem('javascript:alert(1)')).toBe(false)
  })

  it('marca so os primeiros cards da primeira secao', () => {
    expect(devePriorizarImagemProduto(true, 0)).toBe(true)
    expect(devePriorizarImagemProduto(true, PRIMEIRAS_IMAGENS_PRIORITY - 1)).toBe(true)
    expect(devePriorizarImagemProduto(true, PRIMEIRAS_IMAGENS_PRIORITY)).toBe(false)
    expect(devePriorizarImagemProduto(false, 0)).toBe(false)
  })
})
