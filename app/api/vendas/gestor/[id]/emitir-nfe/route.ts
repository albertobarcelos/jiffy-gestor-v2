import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

/**
 * POST /api/vendas/gestor/[id]/emitir-nfe
 * Emite NFe ou NFCe para uma venda do gestor
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'ID da venda é obrigatório' }, { status: 400 })
    }

    const body = await request.json()

    // Buscar dados fiscais da empresa para obter codigoMunicipio
    const apiClient = new ApiClient()
    let codigoMunicipio: string | undefined
    let payloadCompleto: any = { ...body } // Declarar no escopo correto

    // Buscar codigoMunicipio dos dados da empresa
    try {
      // Tentar primeiro nos dados fiscais
      const fiscalResponse = await apiClient.request<any>(
        '/api/v1/fiscal/empresas-fiscais/me',
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${tokenInfo.token}`,
          },
        }
      )

      // O codigoMunicipio pode vir como codigoMunicipio ou codigoCidadeIbge
      codigoMunicipio = fiscalResponse.data?.codigoMunicipio || fiscalResponse.data?.codigoCidadeIbge
      
      console.log('[Emitir NFe Gestor] Dados fiscais da empresa:', {
        codigoMunicipio,
        hasFiscalData: !!fiscalResponse.data,
        fiscalDataKeys: fiscalResponse.data ? Object.keys(fiscalResponse.data) : [],
      })
    } catch (fiscalError) {
      console.warn('[Emitir NFe Gestor] Erro ao buscar dados fiscais:', fiscalError)
    }

    // Se não encontrou nos dados fiscais, tentar nos dados da empresa
    if (!codigoMunicipio) {
      try {
        const empresaResponse = await apiClient.request<any>(
          '/api/v1/empresas/me',
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${tokenInfo.token}`,
            },
          }
        )

        // Buscar no endereço da empresa
        codigoMunicipio = empresaResponse.data?.endereco?.codigoMunicipio || 
                          empresaResponse.data?.endereco?.codigoCidadeIbge ||
                          empresaResponse.data?.codigoMunicipio ||
                          empresaResponse.data?.codigoCidadeIbge

        console.log('[Emitir NFe Gestor] Dados da empresa:', {
          codigoMunicipio,
          hasEmpresaData: !!empresaResponse.data,
          endereco: empresaResponse.data?.endereco,
        })
      } catch (empresaError) {
        console.warn('[Emitir NFe Gestor] Erro ao buscar dados da empresa:', empresaError)
      }
    }

    // Adicionar codigoMunicipio ao payload se encontrado
    if (codigoMunicipio) {
      payloadCompleto.codigoMunicipio = codigoMunicipio
    }

    // Log para debug - mostrar o JSON que será enviado
    const payloadString = JSON.stringify(payloadCompleto)
    console.log('[Emitir NFe Gestor] Payload completo antes de enviar:', {
      vendaId: id,
      payloadCompleto,
      payloadString,
      codigoMunicipioType: typeof payloadCompleto.codigoMunicipio,
      codigoMunicipioValue: payloadCompleto.codigoMunicipio,
      hasCodigoMunicipio: 'codigoMunicipio' in payloadCompleto,
    })

    const response = await apiClient.request<any>(
      `/api/v1/gestor/vendas/${id}/emitir-nfe`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenInfo.token}`,
          'Content-Type': 'application/json',
        },
        body: payloadString,
      }
    )

    console.log('[Emitir NFe Gestor] Resposta do backend:', {
      vendaId: id,
      status: 'success',
      data: response.data,
    })

    return NextResponse.json(response.data || {}, { status: 201 })
  } catch (error) {
    console.error('[Emitir NFe Gestor] Erro completo:', {
      error,
      errorType: error instanceof ApiError ? 'ApiError' : typeof error,
      errorMessage: error instanceof ApiError ? error.message : (error as any)?.message,
      errorStatus: error instanceof ApiError ? error.status : undefined,
      errorData: error instanceof ApiError ? error.data : undefined,
      payloadEnviado: payloadCompleto,
    })
    
    if (error instanceof ApiError) {
      // Log detalhado do erro do backend
      console.error('[Emitir NFe Gestor] Detalhes do erro do backend:', {
        status: error.status,
        message: error.message,
        data: error.data,
        payloadEnviado: payloadCompleto,
        payloadString: JSON.stringify(payloadCompleto),
      })
      
      return NextResponse.json(
        { error: error.message || 'Erro ao emitir NFe' },
        { status: error.status }
      )
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
