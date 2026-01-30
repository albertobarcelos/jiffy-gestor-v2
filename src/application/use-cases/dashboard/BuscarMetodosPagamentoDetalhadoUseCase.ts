import { DashboardMetodoPagamento } from '@/src/domain/entities/DashboardMetodoPagamento';
import { useAuthStore } from '@/src/presentation/stores/authStore'; // Para obter o token de autenticação

interface VendaListApiResponse {
  items: { id: string }[];
  count?: number;
  totalPages?: number;
  limit?: number;
}

interface VendaDetalhesApiResponse {
  id: string;
  status?: string;
  dataFinalizacao?: string;
  dataCancelamento?: string | null;
  troco?: number;
  pagamentos: {
    id: string;
    valor: number;
    meioPagamentoId: string;
    cancelado: boolean;
    canceladoPorId?: string | null;
    dataCancelamento?: string | null;
    // ... outras propriedades que não usaremos
  }[];
  // ... outras propriedades que não usaremos
}

interface MeioPagamentoApiResponse {
  id: string;
  nome: string;
  formaPagamentoFiscal?: string; // Campo para identificar se é dinheiro
  // ... outras propriedades
}

interface PeriodoDates {
  periodoInicial: string;
  periodoFinal: string;
}

function getPeriodoDates(periodo: string): PeriodoDates {
  const now = new Date();

  let inicio: Date | null = null;
  let fim: Date | null = null;

  switch (periodo) {
    case 'hoje':
      inicio = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      inicio.setHours(0, 0, 0, 0);
      fim = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      fim.setHours(23, 59, 59, 999);
      break;
    case 'semana': // Corresponde a 'Últimos 7 Dias'
      inicio = new Date(now);
      inicio.setDate(now.getDate() - 6); // Hoje - 6 dias = 7 dias no total
      inicio.setHours(0, 0, 0, 0);
      fim = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      fim.setHours(23, 59, 59, 999);
      break;
    case '30dias': // Adicionado para 'Últimos 30 Dias'
      inicio = new Date(now);
      inicio.setDate(now.getDate() - 29); // Hoje - 29 dias = 30 dias no total
      inicio.setHours(0, 0, 0, 0);
      fim = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      fim.setHours(23, 59, 59, 999);
      break;
    case 'mes': // Corresponde a 'Mês Atual'
      inicio = new Date(now.getFullYear(), now.getMonth(), 1);
      inicio.setHours(0, 0, 0, 0);
      fim = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      fim.setHours(23, 59, 59, 999);
      break;
    case '60dias': // Adicionado para 'Últimos 60 Dias'
      inicio = new Date(now);
      inicio.setDate(now.getDate() - 59); // Hoje - 59 dias = 60 dias no total
      inicio.setHours(0, 0, 0, 0);
      fim = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      fim.setHours(23, 59, 59, 999);
      break;
    case '90dias': // Adicionado para 'Últimos 90 Dias'
      inicio = new Date(now);
      inicio.setDate(now.getDate() - 89); // Hoje - 89 dias = 90 dias no total
      inicio.setHours(0, 0, 0, 0);
      fim = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      fim.setHours(23, 59, 59, 999);
      break;
    default:
      // Se o período for 'todos' ou inválido, não aplica filtro de data
      return { periodoInicial: '', periodoFinal: '' };
  }

  const result = {
    periodoInicial: inicio ? inicio.toISOString() : '',
    periodoFinal: fim ? fim.toISOString() : '',
  };

  console.log(`getPeriodoDates para ${periodo}:`, result);
  return result;
}


export class BuscarMetodosPagamentoDetalhadoUseCase {
  /**
   * Busca todas as vendas finalizadas com paginação completa
   */
  private async fetchAllVendasFinalizadas(
    baseUrl: string,
    headers: HeadersInit,
    periodoInicial: string,
    periodoFinal: string
  ): Promise<string[]> {
    const baseParams = new URLSearchParams();

    if (periodoInicial && periodoFinal) {
      baseParams.append('periodoInicial', periodoInicial);
      baseParams.append('periodoFinal', periodoFinal);
    }
    baseParams.append('status', 'FINALIZADA'); // Apenas vendas finalizadas

    const limitPerPage = 100;
    let allVendaIds: string[] = [];
    let currentPage = 0;
    let totalPages = 1;

    while (currentPage < totalPages) {
      const currentParams = new URLSearchParams(baseParams.toString());
      currentParams.append('limit', limitPerPage.toString());
      currentParams.append('offset', (currentPage * limitPerPage).toString());

      const vendasUrl = `${baseUrl}/api/v1/operacao-pdv/vendas?${currentParams.toString()}`;
      console.log(`Buscando página ${currentPage + 1} de vendas finalizadas:`, vendasUrl);

      const vendasResponse = await fetch(vendasUrl, { headers });
      if (!vendasResponse.ok) {
        throw new Error(`Erro ao buscar vendas finalizadas (página ${currentPage + 1})`);
      }

      const vendasData: VendaListApiResponse = await vendasResponse.json();
      const pageVendaIds = vendasData.items.map((venda) => venda.id);
      allVendaIds = allVendaIds.concat(pageVendaIds);

      // Determina o total de páginas na primeira requisição
      if (currentPage === 0) {
        if (vendasData.totalPages) {
          totalPages = vendasData.totalPages;
        } else if (vendasData.count && vendasData.limit) {
          totalPages = Math.ceil(vendasData.count / vendasData.limit);
        } else if (pageVendaIds.length < limitPerPage) {
          // Se retornou menos que o limite, não há mais páginas
          totalPages = 1;
        }
      }

      currentPage++;
    }

    console.log(`Total de ${allVendaIds.length} vendas finalizadas encontradas em ${totalPages} página(s)`);
    return allVendaIds;
  }

  /**
   * Valida se uma venda está realmente finalizada
   */
  private isVendaFinalizada(venda: VendaDetalhesApiResponse): boolean {
    // Verifica se tem data de cancelamento (não deve ter)
    if (venda.dataCancelamento) {
      return false;
    }

    // Verifica se tem data de finalização (deve ter)
    if (!venda.dataFinalizacao) {
      return false;
    }

    // Se tiver campo status, valida explicitamente
    if (venda.status) {
      return venda.status.toUpperCase() === 'FINALIZADA';
    }

    // Se não tiver campo status, considera finalizada se tem dataFinalizacao e não tem dataCancelamento
    return true;
  }

  async execute(periodo: string = 'hoje'): Promise<DashboardMetodoPagamento[]> {
    const { auth } = useAuthStore.getState();
    const token = auth?.getAccessToken();
    const baseUrl = process.env.NEXT_PUBLIC_EXTERNAL_API_BASE_URL;

    if (!token || !baseUrl) {
      throw new Error('Token de autenticação ou URL da API não disponíveis.');
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    const { periodoInicial, periodoFinal } = getPeriodoDates(periodo);

    // Passo 1: Buscar TODAS as IDs das Vendas Finalizadas (com paginação completa)
    const vendaIds = await this.fetchAllVendasFinalizadas(
      baseUrl,
      headers,
      periodoInicial,
      periodoFinal
    );

    if (vendaIds.length === 0) {
      return []; // Não há vendas finalizadas para processar
    }

    // Cache para dados completos dos meios de pagamento
    const paymentMethodCache = new Map<string, MeioPagamentoApiResponse>();

    // Função auxiliar para buscar dados completos do meio de pagamento
    const getPaymentMethodData = async (id: string): Promise<MeioPagamentoApiResponse | null> => {
      if (paymentMethodCache.has(id)) {
        return paymentMethodCache.get(id)!;
      }

      const paymentMethodUrl = `${baseUrl}/api/v1/pagamento/meios-pagamento/${id}`;
      console.log('URL da requisição de meios de pagamento:', paymentMethodUrl);

      const response = await fetch(paymentMethodUrl, { headers });
      if (!response.ok) {
        console.warn(`Não foi possível buscar dados para o meio de pagamento ID: ${id}. Status: ${response.status}`);
        return null;
      }
      const data: MeioPagamentoApiResponse = await response.json();
      console.log(`Resposta da API de meios de pagamento para ID ${id}:`, data);
      paymentMethodCache.set(id, data);
      return data;
    };

    // Função auxiliar para buscar apenas o nome (compatibilidade)
    const getPaymentMethodName = async (id: string): Promise<string> => {
      const data = await getPaymentMethodData(id);
      return data?.nome || 'Desconhecido';
    };


    // Passo 2: Buscar Detalhes de Cada Venda e Validar Status
    const detailedVendasPromises = vendaIds.map(async (vendaId) => {
      const detalhesResponse = await fetch(`${baseUrl}/api/v1/operacao-pdv/vendas/${vendaId}`, { headers });
      if (!detalhesResponse.ok) {
        console.warn(`Não foi possível buscar detalhes para a venda ID: ${vendaId}`);
        return null; // Ignorar vendas que não puderam ser detalhadas
      }
      return detalhesResponse.json() as Promise<VendaDetalhesApiResponse>;
    });

    const allDetailedVendas = (await Promise.all(detailedVendasPromises)).filter(
      Boolean
    ) as VendaDetalhesApiResponse[];

    // Passo 3: Filtrar apenas vendas realmente FINALIZADAS (validação adicional)
    const detailedVendas = allDetailedVendas.filter((venda) => {
      const isFinalizada = this.isVendaFinalizada(venda);
      if (!isFinalizada) {
        console.warn(
          `Venda ${venda.id} foi filtrada: não está finalizada (status: ${venda.status}, dataFinalizacao: ${venda.dataFinalizacao}, dataCancelamento: ${venda.dataCancelamento})`
        );
      }
      return isFinalizada;
    });

    console.log(
      `Processando ${detailedVendas.length} vendas finalizadas (${allDetailedVendas.length - detailedVendas.length} foram filtradas)`
    );

    // Passo 4: Agregar os Dados apenas das vendas finalizadas e pagamentos não cancelados
    const methodAggregation = new Map<string, { metodo: string; valor: number; quantidade: number }>();
    let totalSalesValue = 0;
    let totalPagamentosCancelados = 0;

    for (const venda of detailedVendas) {
      // Garante que a venda tem pagamentos
      if (!venda.pagamentos || venda.pagamentos.length === 0) {
        continue;
      }

      // Filtra apenas pagamentos não cancelados
      const pagamentosNaoCancelados = venda.pagamentos.filter((pagamento) => {
        // Um pagamento está cancelado se:
        // 1. O campo cancelado é true, OU
        // 2. Tem dataCancelamento preenchida
        const isCancelado = pagamento.cancelado === true || (pagamento.dataCancelamento !== null && pagamento.dataCancelamento !== undefined);
        
        if (isCancelado) {
          totalPagamentosCancelados++;
        }
        
        return !isCancelado;
      });

      // Se houver troco, calcula o total de pagamentos em dinheiro para distribuir o troco
      let totalPagamentosDinheiro = 0;
      const pagamentosComDados: Array<{
        pagamento: typeof pagamentosNaoCancelados[0];
        metodoNome: string;
        isDinheiro: boolean;
        valorOriginal: number;
      }> = [];

      // Primeiro, identifica todos os pagamentos e calcula total de dinheiro
      for (const pagamento of pagamentosNaoCancelados) {
        const paymentMethodData = await getPaymentMethodData(pagamento.meioPagamentoId);
        const metodoNome = paymentMethodData?.nome || 'Desconhecido';
        
        // Verifica se é dinheiro
        let isDinheiro = false;
        if (paymentMethodData) {
          const nomeLower = (paymentMethodData.nome || '').toLowerCase();
          const formaFiscalLower = (paymentMethodData.formaPagamentoFiscal || '').toLowerCase();
          isDinheiro = nomeLower.includes('dinheiro') || formaFiscalLower.includes('dinheiro');
        }

        if (isDinheiro) {
          totalPagamentosDinheiro += pagamento.valor;
        }

        pagamentosComDados.push({
          pagamento,
          metodoNome,
          isDinheiro,
          valorOriginal: pagamento.valor,
        });
      }

      // Processa os pagamentos aplicando desconto de troco se necessário
      for (const { pagamento, metodoNome, isDinheiro, valorOriginal } of pagamentosComDados) {
        let valorPagamento = valorOriginal;

        // Se for pagamento em dinheiro e houver troco, subtrai o troco proporcionalmente
        if (isDinheiro && venda.troco && venda.troco > 0 && totalPagamentosDinheiro > 0) {
          // Calcula a proporção deste pagamento no total de dinheiro
          const proporcao = valorOriginal / totalPagamentosDinheiro;
          const trocoProporcional = venda.troco * proporcao;
          valorPagamento = Math.max(0, valorOriginal - trocoProporcional);
          
          console.log(
            `Venda ${venda.id}: Pagamento em dinheiro - valor pago R$ ${valorOriginal.toFixed(2)}, troco proporcional R$ ${trocoProporcional.toFixed(2)}, valor líquido R$ ${valorPagamento.toFixed(2)}`
          );
        }

        totalSalesValue += valorPagamento;

        if (methodAggregation.has(metodoNome)) {
          const existing = methodAggregation.get(metodoNome)!;
          existing.valor += valorPagamento;
          existing.quantidade += 1; // Cada pagamento é 1 transação
          methodAggregation.set(metodoNome, existing);
        } else {
          methodAggregation.set(metodoNome, {
            metodo: metodoNome,
            valor: valorPagamento,
            quantidade: 1,
          });
        }
      }
    }

    if (totalPagamentosCancelados > 0) {
      console.log(`Foram ignorados ${totalPagamentosCancelados} pagamento(s) cancelado(s) no cálculo do gráfico`);
    }

    // Passo 5: Retornar no Formato DashboardMetodoPagamento[]
    const metodosPagamento: DashboardMetodoPagamento[] = Array.from(methodAggregation.values())
      .map((item) =>
        DashboardMetodoPagamento.create({
          metodo: item.metodo,
          valor: item.valor,
          quantidade: item.quantidade,
          percentual: totalSalesValue > 0 ? (item.valor / totalSalesValue) * 100 : 0,
        })
      )
      .sort((a, b) => b.getValor() - a.getValor());

    console.log(
      `Gráfico de métodos de pagamento: ${metodosPagamento.length} métodos, total R$ ${totalSalesValue.toFixed(2)}`
    );

    return metodosPagamento;
  }
}

