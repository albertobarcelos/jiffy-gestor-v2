import { afterEach, describe, expect, it } from 'vitest'
import { buildNotaFiscalPublicaUrl } from '@/src/shared/utils/notaFiscalPublicaUrl'

describe('buildNotaFiscalPublicaUrl', () => {
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL

  afterEach(() => {
    if (originalAppUrl === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL
    } else {
      process.env.NEXT_PUBLIC_APP_URL = originalAppUrl
    }
  })

  it('monta URL com base de NEXT_PUBLIC_APP_URL sem barra final', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://gestor.homolog.jiffy.run/'
    expect(buildNotaFiscalPublicaUrl('abc-123')).toBe(
      'https://gestor.homolog.jiffy.run/notas-fiscais/abc-123'
    )
  })

  it('codifica caracteres especiais no id', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
    expect(buildNotaFiscalPublicaUrl('id com espaço')).toBe(
      'http://localhost:3000/notas-fiscais/id%20com%20espa%C3%A7o'
    )
  })

  it('rejeita id vazio', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
    expect(() => buildNotaFiscalPublicaUrl('  ')).toThrow(/obrigatório/i)
  })
})
