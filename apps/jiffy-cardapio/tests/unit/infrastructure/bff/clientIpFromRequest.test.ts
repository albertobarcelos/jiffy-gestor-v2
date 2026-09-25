import { describe, expect, it } from 'vitest'
import {
  clientIpFromRequest,
  headersEncaminharIpCliente,
} from '@/src/infrastructure/bff/clientIpFromRequest'

function req(headers: Record<string, string>): Request {
  return new Request('https://cardapio.jiffy.run/api/public/delivery/cotacao', {
    headers,
  })
}

describe('clientIpFromRequest', () => {
  it('usa o primeiro IP de X-Forwarded-For (cliente na Vercel)', () => {
    expect(
      clientIpFromRequest(req({ 'x-forwarded-for': '201.17.8.4, 172.16.0.2' }))
    ).toBe('201.17.8.4')
  })

  it('cai em X-Real-IP se nao houver Forwarded', () => {
    expect(clientIpFromRequest(req({ 'x-real-ip': '189.1.2.3' }))).toBe('189.1.2.3')
  })

  it('sem header devolve null', () => {
    expect(clientIpFromRequest(req({}))).toBeNull()
  })

  it('monta headers para o backend', () => {
    expect(
      headersEncaminharIpCliente(req({ 'x-forwarded-for': '201.17.8.4, 10.0.0.1' }))
    ).toEqual({
      'X-Forwarded-For': '201.17.8.4',
      'X-Real-IP': '201.17.8.4',
    })
  })
})
