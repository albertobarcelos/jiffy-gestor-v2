import { describe, expect, it } from 'vitest'
import {
  devePollarStatusCanalWhatsApp,
  normalizarCanalWhatsApp,
  normalizarStatusCanalWhatsApp,
  qrCodeWhatsAppExpirado,
  srcImagemQrCodeWhatsApp,
} from '@/src/application/mappers/CanalWhatsAppDeliveryMapper'
import { QR_CODE_WHATSAPP_VALIDADE_MS } from '@/src/application/dto/delivery/CanalWhatsAppDeliveryDTO'
import {
  CanalWhatsAppIndisponivelError,
  isCanalWhatsAppIndisponivel,
  MENSAGEM_CANAL_WHATSAPP_INDISPONIVEL_SUPORTE,
} from '@/src/shared/utils/canalWhatsAppFalha'

const canalBase = {
  id: 'canal-1',
  instanceName: 'delivery_loja_abc',
  status: 'conectando',
  conectado: false,
  dataCriacao: '2026-09-06T12:00:00.000Z',
  dataAtualizacao: '2026-09-06T12:00:00.000Z',
}

describe('CanalWhatsAppDeliveryMapper', () => {
  it('normaliza o canal com QR em base64 cru ou data URL', () => {
    const comQr = normalizarCanalWhatsApp({
      ...canalBase,
      qrcode: { base64: 'iVBORw0KGgo=', pairingCode: 'ABCD' },
    })
    expect(comQr?.qrcode).toEqual({ base64: 'iVBORw0KGgo=', pairingCode: 'ABCD' })
    expect(srcImagemQrCodeWhatsApp(comQr?.qrcode?.base64)).toBe(
      'data:image/png;base64,iVBORw0KGgo='
    )
    expect(srcImagemQrCodeWhatsApp('data:image/png;base64,AAA')).toBe(
      'data:image/png;base64,AAA'
    )
    expect(srcImagemQrCodeWhatsApp('  ')).toBeNull()
  })

  it('normaliza o status vivo da Evolution', () => {
    expect(
      normalizarStatusCanalWhatsApp({
        instanceName: 'delivery_loja_abc',
        status: 'conectado',
        conectado: true,
      })
    ).toEqual({
      instanceName: 'delivery_loja_abc',
      status: 'conectado',
      conectado: true,
    })
    expect(normalizarCanalWhatsApp({ id: 'x' })).toBeNull()
  })

  it('expira o QR em 60s e continua o poll enquanto o QR está na tela', () => {
    const agora = 100_000
    expect(qrCodeWhatsAppExpirado(agora - QR_CODE_WHATSAPP_VALIDADE_MS, agora)).toBe(true)
    expect(qrCodeWhatsAppExpirado(agora - 1_000, agora)).toBe(false)

    expect(
      devePollarStatusCanalWhatsApp({
        conectado: false,
        temQrVisivel: true,
        qrExpirado: false,
      })
    ).toBe(true)
    expect(
      devePollarStatusCanalWhatsApp({
        conectado: true,
        temQrVisivel: true,
        qrExpirado: false,
      })
    ).toBe(false)
    expect(
      devePollarStatusCanalWhatsApp({
        conectado: false,
        temQrVisivel: true,
        qrExpirado: true,
      })
    ).toBe(false)
    expect(
      devePollarStatusCanalWhatsApp({
        conectado: false,
        temQrVisivel: false,
        qrExpirado: false,
      })
    ).toBe(false)
  })
})

describe('canalWhatsAppFalha', () => {
  it('esconde detalhe técnico e aponta o suporte', () => {
    const erro = new CanalWhatsAppIndisponivelError()
    expect(erro.message).toBe(MENSAGEM_CANAL_WHATSAPP_INDISPONIVEL_SUPORTE)
    expect(isCanalWhatsAppIndisponivel(erro)).toBe(true)
    expect(isCanalWhatsAppIndisponivel({ errorCode: 'EVOLUTION_UNAVAILABLE' }, 503)).toBe(true)
    expect(isCanalWhatsAppIndisponivel(new Error('timeout'), 200)).toBe(false)
  })
})
