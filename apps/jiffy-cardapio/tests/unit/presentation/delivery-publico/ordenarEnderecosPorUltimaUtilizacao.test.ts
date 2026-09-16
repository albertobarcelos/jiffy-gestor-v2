import { describe, expect, it } from 'vitest'
import type { EnderecoClienteDeliveryPublicoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import {
  escolherEnderecoMaisRecenteCliente,
  ordenarEnderecosPorUltimaUtilizacao,
} from '@/src/presentation/components/features/delivery-publico/shared/utils/ordenarEnderecosPorUltimaUtilizacao'

function endereco(
  partial: Partial<EnderecoClienteDeliveryPublicoDTO> & { id: string }
): EnderecoClienteDeliveryPublicoDTO {
  return {
    etiqueta: 'casa',
    rua: 'Rua A',
    numero: '1',
    bairro: 'Centro',
    cidade: 'Cidade',
    estado: 'MT',
    cep: null,
    complemento: null,
    ultimaUtilizacaoEm: null,
    ...partial,
  }
}

describe('ordenarEnderecosPorUltimaUtilizacao', () => {
  it('ordena pelo mais recente e escolhe o último usado como padrão', () => {
    const lista = [
      endereco({ id: 'antigo', ultimaUtilizacaoEm: '2026-01-01T12:00:00.000Z' }),
      endereco({ id: 'sem-data', ultimaUtilizacaoEm: null }),
      endereco({ id: 'recente', ultimaUtilizacaoEm: '2026-09-10T18:00:00.000Z' }),
    ]

    expect(ordenarEnderecosPorUltimaUtilizacao(lista).map(e => e.id)).toEqual([
      'recente',
      'antigo',
      'sem-data',
    ])
    expect(escolherEnderecoMaisRecenteCliente(lista)?.id).toBe('recente')
  })

  it('retorna null para lista vazia', () => {
    expect(escolherEnderecoMaisRecenteCliente([])).toBeNull()
  })
})
