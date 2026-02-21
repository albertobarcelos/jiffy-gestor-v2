import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

/**
 * POST /api/vendas/gestor/[id]/emitir-nota
 * Emite nota fiscal (NFC-e ou NF-e) para uma venda do gestor
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Declarar no escopo da função para estar acessível no catch
  let payloadCompleto: any = null
  
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
    payloadCompleto = { ...body } // Inicializar no escopo do try

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
      `/api/v1/gestor/vendas/${id}/emitir-nota`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenInfo.token}`,
          'Content-Type': 'application/json',
        },
        body: payloadString,
      }
    )

    return NextResponse.json(response.data || {}, { status: response.status })
  } catch (error) {
    console.error('Erro ao emitir nota fiscal para venda gestor:', error)
    if (error instanceof ApiError) {
      // Log detalhado do erro do backend
      console.error('[Emitir NFe Gestor] Detalhes do erro do backend:', {
        status: error.status,
        message: error.message,
        data: error.data,
        payloadEnviado: payloadCompleto || 'Não disponível (erro antes de montar payload)',
        payloadString: payloadCompleto ? JSON.stringify(payloadCompleto) : 'Não disponível',
      })
      
      return NextResponse.json(
        { error: error.message || 'Erro ao emitir nota fiscal' },
        { status: error.status }
      )
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
