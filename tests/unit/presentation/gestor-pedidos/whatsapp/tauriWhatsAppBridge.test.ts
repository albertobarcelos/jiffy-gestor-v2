/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest'
import { deveReposicionarWhatsAppNativo } from '@/src/presentation/gestor-pedidos/whatsapp/tauriWhatsAppBridge'

describe('deveReposicionarWhatsAppNativo', () => {
  it('reposiciona só com a janela visível', () => {
    expect(deveReposicionarWhatsAppNativo('visible')).toBe(true)
  })

  it('não manda show nativo com a janela minimizada ou oculta', () => {
    expect(deveReposicionarWhatsAppNativo('hidden')).toBe(false)
    expect(deveReposicionarWhatsAppNativo('prerender')).toBe(false)
    expect(deveReposicionarWhatsAppNativo(undefined)).toBe(false)
  })
})
