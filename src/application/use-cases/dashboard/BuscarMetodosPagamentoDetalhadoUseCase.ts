import { DashboardMetodoPagamento } from '@/src/domain/entities/DashboardMetodoPagamento';
import { useAuthStore } from '@/src/presentation/stores/authStore'; // Para obter o token de autenticação

interface VendaListApiResponse {
  items: { id: string }[];
  // ... outras propriedades que não usaremos
}

interface VendaDetalhesApiResponse {
  id: string;
  pagamentos: {
    id: string;
    valor: number;
    meioPagamentoId: string;
    // ... outras propriedades que não usaremos
  }[];
  // ... outras propriedades que não usaremos
}

interface MeioPagamentoApiResponse {
  id: string;
  nome: string; // <-- Este é o campo que precisamos!
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
    const params = new URLSearchParams();

    if (periodoInicial && periodoFinal) {
      params.append('periodoInicial', periodoInicial);
      params.append('periodoFinal', periodoFinal);
    }
    params.append('status', 'FINALIZADA'); // Apenas vendas finalizadas

    const vendasUrl = `${baseUrl}/api/v1/operacao-pdv/vendas?${params.toString()}`;
    console.log('URL da requisição de vendas:', vendasUrl);

    // Passo 1: Buscar IDs das Vendas
    const vendasResponse = await fetch(vendasUrl, { headers });
    if (!vendasResponse.ok) {
      throw new Error('Erro ao buscar vendas por período.');
    }
    const vendasData: VendaListApiResponse = await vendasResponse.json();
    console.log('Resposta da API de vendas:', vendasData);
    const vendaIds = vendasData.items.map(venda => venda.id);

    if (vendaIds.length === 0) {
      return []; // Não há vendas para processar
    }

    // Cache para nomes dos meios de pagamento
    const paymentMethodNamesCache = new Map<string, string>();

    // Função auxiliar para buscar o nome do meio de pagamento
    const getPaymentMethodName = async (id: string): Promise<string> => {
      if (paymentMethodNamesCache.has(id)) {
        return paymentMethodNamesCache.get(id)!;
      }

      const paymentMethodUrl = `${baseUrl}/api/v1/pagamento/meios-pagamento/${id}`;
      console.log('URL da requisição de meios de pagamento:', paymentMethodUrl);

      const response = await fetch(paymentMethodUrl, { headers });
      if (!response.ok) {
        console.warn(`Não foi possível buscar o nome para o meio de pagamento ID: ${id}. Status: ${response.status}`);
        return 'Desconhecido';
      }
      const data: MeioPagamentoApiResponse = await response.json();
      console.log(`Resposta da API de meios de pagamento para ID ${id}:`, data);
      paymentMethodNamesCache.set(id, data.nome);
      return data.nome;
    };


    // Passo 2: Buscar Detalhes de Cada Venda e Resolver Nomes
    const detailedVendasPromises = vendaIds.map(async (vendaId) => {
      const detalhesResponse = await fetch(`${baseUrl}/api/v1/operacao-pdv/vendas/${vendaId}`, { headers });
      if (!detalhesResponse.ok) {
        console.warn(`Não foi possível buscar detalhes para a venda ID: ${vendaId}`);
        return null; // Ignorar vendas que não puderam ser detalhadas
      }
      return detalhesResponse.json() as Promise<VendaDetalhesApiResponse>;
    });

    const detailedVendas = (await Promise.all(detailedVendasPromises)).filter(Boolean) as VendaDetalhesApiResponse[];

    // Passo 3: Agregar os Dados
    const methodAggregation = new Map<string, { metodo: string; valor: number; quantidade: number }>();
    let totalSalesValue = 0;

    for (const venda of detailedVendas) {
      for (const pagamento of venda.pagamentos) {
        const metodoPagamentoId = pagamento.meioPagamentoId;
        const valorPagamento = pagamento.valor;

        const metodoNome = await getPaymentMethodName(metodoPagamentoId); // Resolve o nome aqui

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

    // Passo 4: Retornar no Formato DashboardMetodoPagamento[]
    const metodosPagamento: DashboardMetodoPagamento[] = Array.from(methodAggregation.values())
      .map(item => DashboardMetodoPagamento.create({
        metodo: item.metodo,
        valor: item.valor,
        quantidade: item.quantidade,
        percentual: totalSalesValue > 0 ? (item.valor / totalSalesValue) * 100 : 0,
      }))
      .sort((a, b) => b.getValor() - a.getValor());

    return metodosPagamento;
  }
}

