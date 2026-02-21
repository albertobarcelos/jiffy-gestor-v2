import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast } from '@/src/shared/utils/toast'

/**
 * DTO unificado para vendas do PDV e do Gestor (TypeScript)
 * Deve corresponder à classe VendaUnificadaDTO do backend
 */
export class VendaUnificadaDTO {
    constructor(
        public readonly id: string,
        public readonly numeroVenda: number,
        public readonly codigoVenda: string,
        public readonly tipoVenda: string | null,
        public readonly origem: 'PDV' | 'GESTOR' | 'DELIVERY_IFOOD' | 'DELIVERY_UBER',
        public readonly tabelaOrigem: 'venda' | 'venda_gestor',
        public readonly valorFinal: number,
        public readonly totalDesconto: number,
        public readonly totalAcrescimo: number,
        public readonly dataCriacao: string,
        public readonly dataFinalizacao: string | null,
        public readonly cliente: {
            id: string;
            nome: string;
            cpfCnpj?: string;
        } | null,
        public readonly solicitarEmissaoFiscal: boolean,
        public readonly statusFiscal: 'PENDENTE_EMISSAO' | 'EMITINDO' | 'PENDENTE_AUTORIZACAO' | 'CONTINGENCIA' | 'EMITIDA' | 'REJEITADA' | 'CANCELADA' | null,
        public readonly documentoFiscalId: string | null,
        public readonly abertoPor: {
            id: string;
            nome: string;
        },
        public readonly numeroFiscal?: number | null,
        public readonly serieFiscal?: string | null,
        public readonly dataEmissaoFiscal?: string | null,
        public readonly tipoDocFiscal?: 'NFE' | 'NFCE' | null
    ) {}

    isPendenteEmissao(): boolean {
        // Vendas GESTOR: sempre pendentes de emissão quando finalizadas (exceto se já emitida)
        // Vendas PDV: pendentes apenas se foram marcadas para emissão
        if (this.isVendaGestor()) {
            return !!this.dataFinalizacao && this.statusFiscal !== 'EMITIDA';
        }
        return this.solicitarEmissaoFiscal && this.statusFiscal !== 'EMITIDA';
    }

    temNFeEmitida(): boolean {
        return this.statusFiscal === 'EMITIDA' && !!this.documentoFiscalId;
    }

    isVendaPdv(): boolean {
        return this.tabelaOrigem === 'venda';
    }

    isVendaGestor(): boolean {
        return this.tabelaOrigem === 'venda_gestor';
    }

    isDelivery(): boolean {
        return this.origem === 'DELIVERY_IFOOD' || this.origem === 'DELIVERY_UBER';
    }

    getEtapaKanban(): string {
        if (this.temNFeEmitida()) return 'COM_NFE';
        if (this.isPendenteEmissao()) return 'PENDENTE_EMISSAO';
        if (this.dataFinalizacao) return 'FINALIZADAS';
        return 'ABERTA';
    }
}

/**
 * Parâmetros alinhados ao contrato do backend:
 * - Filtros: origem, statusFiscal, periodoInicial, periodoFinal
 * - Paginação: offset, limit
 * - empresaId vem do JWT (backend extrai de req.user)
 */
interface VendasUnificadasQueryParams {
    origem?: 'PDV' | 'GESTOR' | 'DELIVERY'
    statusFiscal?: string
    periodoInicial?: string // ISO date string
    periodoFinal?: string   // ISO date string
    offset?: number
    limit?: number
}

/** Resposta do backend: PaginationResult<VendaUnificadaDTO> */
interface VendasUnificadasResponse {
    count: number
    page: number
    limit: number
    totalPages: number
    hasNext: boolean
    hasPrevious: boolean
    items: VendaUnificadaDTO[]
}

/**
 * Hook para buscar vendas unificadas (PDV + Gestor) com React Query
 */
export function useVendasUnificadas(params: VendasUnificadasQueryParams) {
    const { auth } = useAuthStore()
    const token = auth?.getAccessToken()

    const queryKey = ['vendas-unificadas', params]

    return useQuery({
        queryKey,
        queryFn: async (): Promise<VendasUnificadasResponse> => {
            if (!token) {
                throw new Error('Token não encontrado')
            }

            // Monta query params no formato do backend
            const searchParams = new URLSearchParams()
            if (params.origem) searchParams.append('origem', params.origem)
            if (params.statusFiscal) searchParams.append('statusFiscal', params.statusFiscal)
            if (params.periodoInicial) searchParams.append('periodoInicial', params.periodoInicial)
            if (params.periodoFinal) searchParams.append('periodoFinal', params.periodoFinal)
            if (params.offset != null) searchParams.append('offset', params.offset.toString())
            if (params.limit) searchParams.append('limit', params.limit.toString())

            const response = await fetch(`/api/vendas/unificado?${searchParams.toString()}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                cache: 'no-store',
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                const errorMessage = errorData.error || errorData.message || `Erro ${response.status}: ${response.statusText}`
                throw new Error(errorMessage)
            }

            const data = await response.json()

            // Converter objetos JSON para instâncias de VendaUnificadaDTO
            const items = (data.items || []).map((v: any) => new VendaUnificadaDTO(
                v.id,
                v.numeroVenda,
                v.codigoVenda,
                v.tipoVenda,
                v.origem,
                v.tabelaOrigem,
                v.valorFinal,
                v.totalDesconto,
                v.totalAcrescimo,
                v.dataCriacao,
                v.dataFinalizacao,
                v.solicitarEmissaoFiscal,
                v.statusFiscal,
                v.documentoFiscalId,
                v.abertoPor,
                v.cliente,
                v.numeroFiscal,
                v.serieFiscal,
                v.dataEmissaoFiscal,
                v.tipoDocFiscal
            ))

            return {
                items,
                count: data.count || 0,
                page: data.page || 1,
                limit: data.limit || 10,
                totalPages: data.totalPages || 1,
                hasNext: data.hasNext ?? false,
                hasPrevious: data.hasPrevious ?? false,
            }
        },
        enabled: !!token,
        staleTime: 1000 * 30, // 30 segundos
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
    })
}
