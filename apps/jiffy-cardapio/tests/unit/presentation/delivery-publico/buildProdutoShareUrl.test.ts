import { describe, expect, it } from 'vitest'
import { buildProdutoShareUrl } from '@/src/presentation/components/features/delivery-publico/shared/utils/compartilharProdutoDelivery'

describe('buildProdutoShareUrl', () => {
  it('gera URL de compartilhamento com ?produto=id', () => {
    const url = buildProdutoShareUrl('pontoeprosa', 'prod-123')
    expect(url).toContain('/pontoeprosa')
    expect(url).toContain('produto=prod-123')
  })
})
