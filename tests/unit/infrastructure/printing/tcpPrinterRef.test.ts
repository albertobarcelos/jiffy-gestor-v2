import { describe, expect, it } from 'vitest'
import {
  formatTcpPrinterRef,
  isTcpPrinterRef,
  parseTcpPrinterRef,
} from '@/src/infrastructure/printing/tcpPrinterRef'

describe('tcpPrinterRef', () => {
  it('reconhece tcp://host:porta', () => {
    expect(parseTcpPrinterRef('tcp://192.168.1.50:9100')).toEqual({
      host: '192.168.1.50',
      port: 9100,
    })
    expect(isTcpPrinterRef('tcp://192.168.1.50:9100')).toBe(true)
  })

  it('assume porta 9100 para IP puro', () => {
    expect(parseTcpPrinterRef('192.168.1.50')).toEqual({ host: '192.168.1.50', port: 9100 })
  })

  it('formata referência tcp', () => {
    expect(formatTcpPrinterRef('10.0.0.8', 9107)).toBe('tcp://10.0.0.8:9107')
  })
})
