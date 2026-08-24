import { beforeEach, describe, expect, it } from 'vitest'

const sessionStore = new Map<string, string>()
const sessionStorageShim = {
  getItem: (key: string) => sessionStore.get(key) ?? null,
  setItem: (key: string, value: string) => {
    sessionStore.set(key, value)
  },
  removeItem: (key: string) => {
    sessionStore.delete(key)
  },
  clear: () => sessionStore.clear(),
}

Object.defineProperty(globalThis, 'sessionStorage', {
  value: sessionStorageShim,
  writable: true,
})

import {
  buildAgentPrintJob,
  DEFAULT_JIFFY_PRINT_SETUP_URL,
  DEFAULT_PRINT_AGENT_URL,
  jaPediuDownloadJiffyPrint,
  marcarDownloadJiffyPrintIniciado,
  mensagemJiffyPrintIndisponivel,
  nomeFicheiroInstaladorJiffyPrint,
  urlInstaladorJiffyPrint,
} from '@/src/infrastructure/printing/agent/localAgentClient'

describe('localAgentClient', () => {
  beforeEach(() => {
    sessionStore.clear()
  })

  it('monta PrintJob com a impressora física', () => {
    const body = buildAgentPrintJob({
      jobId: 'venda-1-expedicao-t1',
      printerName: 'POS-80',
      copies: 2,
      document: {
        type: 'ORDER',
        content: [{ type: 'text', text: 'PEDIDO 1', align: 'center' }],
      },
    })
    expect(body.schemaVersion).toBe(1)
    expect(body.source).toBe('WEB')
    expect(body.jobId).toBe('venda-1-expedicao-t1')
    expect(body.printerName).toBe('POS-80')
    expect(body.copies).toBe(2)
    expect(body.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(DEFAULT_PRINT_AGENT_URL).toBe('http://127.0.0.1:38471')
  })

  it('explica que o Jiffy Print precisa estar aberto, sem jargão técnico', () => {
    const msg = mensagemJiffyPrintIndisponivel()
    expect(msg).toContain('Jiffy Print')
    expect(msg).not.toContain('agent.exe')
    expect(msg).not.toContain('127.0.0.1')
    expect(msg).not.toContain('38471')
    expect(urlInstaladorJiffyPrint()).toBe(DEFAULT_JIFFY_PRINT_SETUP_URL)
    expect(DEFAULT_JIFFY_PRINT_SETUP_URL).toContain('JiffyPrint-setup.exe')
    expect(nomeFicheiroInstaladorJiffyPrint()).toBe('JiffyPrint-setup.exe')
  })

  it('marca o pedido de download nesta sessão', () => {
    expect(jaPediuDownloadJiffyPrint()).toBe(false)
    marcarDownloadJiffyPrintIniciado()
    expect(jaPediuDownloadJiffyPrint()).toBe(true)
  })
})
