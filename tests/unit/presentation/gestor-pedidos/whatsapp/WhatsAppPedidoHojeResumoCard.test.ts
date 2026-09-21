import { describe, expect, it } from 'vitest'
import { horaPedidoHoje } from '@/src/presentation/gestor-pedidos/whatsapp/WhatsAppPedidoHojeResumoCard'

describe('horaPedidoHoje', () => {
  it('formata hora local pt-BR', () => {
    expect(horaPedidoHoje('2026-09-17T15:04:00.000-04:00')).toMatch(/\d{2}:\d{2}/)
  })

  it('vazio vira traço', () => {
    expect(horaPedidoHoje(null)).toBe('—')
    expect(horaPedidoHoje('')).toBe('—')
    expect(horaPedidoHoje('nao-e-data')).toBe('—')
  })
})
