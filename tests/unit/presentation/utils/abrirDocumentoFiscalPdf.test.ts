import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { mockFetchGestorApi, mockShowToast } = vi.hoisted(() => ({
  mockFetchGestorApi: vi.fn(),
  mockShowToast: {
    error: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock('@/src/presentation/utils/fetchGestorApi', () => ({
  fetchGestorApi: (...args: unknown[]) => mockFetchGestorApi(...args),
}))

vi.mock('@/src/shared/utils/toast', () => ({
  showToast: mockShowToast,
}))

vi.mock('@/src/presentation/utils/documentoFiscalPdfRetryModalStore', () => ({
  requestDocumentoFiscalPdfRetryChoice: vi.fn(),
}))

import {
  abrirDocumentoFiscalPdf,
  abrirPdfBlobEmNovaAba,
  tipoDocFiscalFromModelo,
} from '@/src/presentation/utils/abrirDocumentoFiscalPdf'

describe('abrirDocumentoFiscalPdf', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('busca o PDF via fetchGestorApi e abre blob (não navega em /api/nfe)', async () => {
    const pdf = new Blob(['%PDF'], { type: 'application/pdf' })
    mockFetchGestorApi.mockResolvedValue(
      new Response(pdf, {
        status: 200,
        headers: { 'Content-Type': 'application/pdf' },
      })
    )

    const createObjectURL = vi.fn(() => 'blob:http://localhost/pdf')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    const open = vi.fn(() => ({ closed: false }))
    vi.stubGlobal('window', { open, setTimeout: vi.fn() })

    await abrirDocumentoFiscalPdf('doc-santos', 'NFE')

    expect(mockFetchGestorApi).toHaveBeenCalledWith('/api/nfe/doc-santos')
    expect(open).toHaveBeenCalledWith('blob:http://localhost/pdf', '_blank', 'noopener')
    expect(open).not.toHaveBeenCalledWith('/api/nfe/doc-santos', expect.anything())
  })

  it('regenera via fetchGestorApi POST, sem fetch cru', async () => {
    const { requestDocumentoFiscalPdfRetryChoice } = await import(
      '@/src/presentation/utils/documentoFiscalPdfRetryModalStore'
    )
    vi.mocked(requestDocumentoFiscalPdfRetryChoice).mockResolvedValue('regenerar')

    mockFetchGestorApi
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Documento não encontrado', retryAfter: 5 }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ mensagem: 'ok' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )

    vi.stubGlobal('window', { open: vi.fn(), setTimeout: vi.fn() })

    await abrirDocumentoFiscalPdf('doc-santos', 'NFE')

    expect(mockFetchGestorApi).toHaveBeenNthCalledWith(1, '/api/nfe/doc-santos')
    expect(mockFetchGestorApi).toHaveBeenNthCalledWith(2, '/api/nfe/doc-santos/regenerar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    expect(mockShowToast.success).toHaveBeenCalled()
  })
})

describe('abrirPdfBlobEmNovaAba', () => {
  it('abre object URL do blob em vez da rota autenticada', () => {
    const createObjectURL = vi.fn(() => 'blob:http://localhost/x')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    const open = vi.fn(() => ({ closed: false }))
    vi.stubGlobal('window', { open, setTimeout: vi.fn() })

    abrirPdfBlobEmNovaAba(new Blob(['%PDF'], { type: 'application/pdf' }))

    expect(createObjectURL).toHaveBeenCalled()
    expect(open).toHaveBeenCalledWith('blob:http://localhost/x', '_blank', 'noopener')
  })
})

describe('tipoDocFiscalFromModelo', () => {
  it('mapeia 55 → NFE e 65 → NFCE', () => {
    expect(tipoDocFiscalFromModelo(55)).toBe('NFE')
    expect(tipoDocFiscalFromModelo(65)).toBe('NFCE')
    expect(tipoDocFiscalFromModelo(null)).toBeNull()
  })
})
