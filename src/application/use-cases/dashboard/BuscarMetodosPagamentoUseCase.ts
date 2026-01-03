import { DashboardMetodoPagamento } from '@/src/domain/entities/DashboardMetodoPagamento'
// import { ApiClient } from '@/src/infrastructure/api/apiClient' // Removido

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

  return {
    periodoInicial: inicio ? inicio.toISOString() : '',
    periodoFinal: fim ? fim.toISOString() : '',
  };
}

export class BuscarMetodosPagamentoUseCase {
  async execute(periodo: string = 'hoje'): Promise<DashboardMetodoPagamento[]> {
    const { periodoInicial, periodoFinal } = getPeriodoDates(periodo);
    const params = new URLSearchParams();

    if (periodoInicial && periodoFinal) {
      params.append('periodoInicial', periodoInicial);
      params.append('periodoFinal', periodoFinal);
    }
    // Adicione status se for necessário para a agregação de métodos de pagamento
    params.append('status', 'FINALIZADA');

    const response = await fetch(`/api/vendas?${params.toString()}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Erro ao buscar métodos de pagamento');
    }

    const data = await response.json();
    const vendasDoPeriodo = data.items || [];

    const methodAggregation = new Map<string, { metodo: string; valor: number; quantidade: number }>();
    let totalSalesValue = 0;

    vendasDoPeriodo.forEach((venda: any) => {
      const metodoPagamento = venda.metodoPagamento || 'Desconhecido';
      const valor = venda.valorFinal || 0;
      const quantidade = 1; // Cada venda é 1 transação para o método

      totalSalesValue += valor;

      if (methodAggregation.has(metodoPagamento)) {
        const existing = methodAggregation.get(metodoPagamento)!;
        existing.valor += valor;
        existing.quantidade += quantidade;
        methodAggregation.set(metodoPagamento, existing);
      } else {
        methodAggregation.set(metodoPagamento, {
          metodo: metodoPagamento,
          valor: valor,
          quantidade: quantidade,
        });
      }
    });

    const metodosPagamento: DashboardMetodoPagamento[] = Array.from(methodAggregation.values())
      .map(item => DashboardMetodoPagamento.create({
        metodo: item.metodo,
        valor: item.valor,
        quantidade: item.quantidade,
        percentual: totalSalesValue > 0 ? (item.valor / totalSalesValue) * 100 : 0,
      }))
      .sort((a, b) => b.getValor() - a.getValor()); // Ordena do maior valor para o menor

    return metodosPagamento;
  }
}