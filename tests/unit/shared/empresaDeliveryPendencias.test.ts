import { describe, expect, it } from 'vitest'
import {
  EMPRESA_DELIVERY_PENDENCIA_TYPES,
  filtrarPendenciasObrigatorias,
  filtrarPendenciasOrientacao,
  lojaDeliveryDisponivel,
  pendenciaEhObrigatoria,
  resolverAcaoPendencia,
} from '@/src/shared/constants/empresaDeliveryPendencias'

describe('empresaDeliveryPendencias', () => {
  it('identifica WhatsApp como orientação (não obrigatória)', () => {
    const item = {
      type: EMPRESA_DELIVERY_PENDENCIA_TYPES.CANAL_WHATSAPP_NAO_CONECTADO,
      message: 'WhatsApp não conectado',
      obrigatoria: false,
    }
    expect(pendenciaEhObrigatoria(item)).toBe(false)
    expect(filtrarPendenciasOrientacao([item])).toHaveLength(1)
    expect(filtrarPendenciasObrigatorias([item])).toHaveLength(0)
  })

  it('usa available=true mesmo com orientações na lista', () => {
    expect(
      lojaDeliveryDisponivel({
        available: true,
        pendencias: [
          {
            type: EMPRESA_DELIVERY_PENDENCIA_TYPES.CANAL_WHATSAPP_NAO_CONECTADO,
            message: 'WhatsApp',
            obrigatoria: false,
          },
        ],
      })
    ).toBe(true)
  })

  it('usa available=false para bloquear loja pública', () => {
    expect(
      lojaDeliveryDisponivel({
        available: false,
        pendencias: [
          {
            type: EMPRESA_DELIVERY_PENDENCIA_TYPES.GEOLOCALIZACAO_NAO_CONFIGURADA,
            message: 'Geo',
            obrigatoria: true,
          },
        ],
      })
    ).toBe(false)
  })

  it('fallback legado: pendência sem obrigatoria bloqueia', () => {
    expect(
      lojaDeliveryDisponivel({
        pendencias: [
          {
            type: EMPRESA_DELIVERY_PENDENCIA_TYPES.CARDAPIO_DELIVERY_NAO_CONFIGURADO,
            message: 'Cardápio',
          },
        ],
      })
    ).toBe(false)
  })

  it('manda fuso para a etapa Empresa e pin/cobertura para o mapa', () => {
    expect(resolverAcaoPendencia(EMPRESA_DELIVERY_PENDENCIA_TYPES.TIMEZONE_NAO_CONFIGURADO)).toEqual({
      label: 'Configurar fuso na aba Empresa',
      href: '/config/delivery/empresa',
    })
    expect(
      resolverAcaoPendencia(EMPRESA_DELIVERY_PENDENCIA_TYPES.GEOLOCALIZACAO_NAO_CONFIGURADA)
    ).toEqual({
      label: 'Definir pin na cobertura de entrega',
      href: '/config/delivery/cobertura',
    })
    expect(
      resolverAcaoPendencia(EMPRESA_DELIVERY_PENDENCIA_TYPES.COBERTURA_NAO_CONFIGURADA)
    ).toEqual({
      label: 'Configurar cobertura de entrega',
      href: '/config/delivery/cobertura',
    })
    expect(
      resolverAcaoPendencia(EMPRESA_DELIVERY_PENDENCIA_TYPES.CANAL_WHATSAPP_NAO_CONECTADO)
    ).toEqual({
      label: 'Conectar WhatsApp',
      href: '/config/delivery/notificacoes',
    })
    expect(resolverAcaoPendencia('TIPO_DESCONHECIDO')).toBeNull()
  })
})
