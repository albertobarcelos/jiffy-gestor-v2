import { describe, expect, it } from 'vitest'
import { buildAgentPrintJob, DEFAULT_PRINT_AGENT_URL } from '@/src/infrastructure/printing/agent/localAgentClient'

describe('localAgentClient', () => {
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
})
