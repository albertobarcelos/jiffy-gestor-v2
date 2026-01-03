import { DashboardEvolucao } from '@/src/domain/entities/DashboardEvolucao'

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

export class BuscarEvolucaoVendasUseCase {
  async execute(periodo: string = 'hoje'): Promise<DashboardEvolucao[]> {
    const { periodoInicial, periodoFinal } = getPeriodoDates(periodo);
    const baseParams = new URLSearchParams();
    
    if (periodoInicial && periodoFinal) {
      baseParams.append('periodoInicial', periodoInicial);
      baseParams.append('periodoFinal', periodoFinal);
    }
    baseParams.append('status', 'FINALIZADA');

    const limitPerPage = 100; // Um limite razoável por página, se a API tiver um máximo de 100
    let allVendas: any[] = [];
    let currentPage = 0;
    let totalPages = 1; // Inicia com 1 para garantir pelo menos uma requisição

    while (currentPage < totalPages) {
      const currentParams = new URLSearchParams(baseParams.toString());
      currentParams.append('limit', limitPerPage.toString());
      currentParams.append('offset', (currentPage * limitPerPage).toString());

      const response = await fetch(`/api/vendas?${currentParams.toString()}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao buscar evolução de vendas');
      }

      const data = await response.json();
      allVendas = allVendas.concat(data.items || []);

      // Atualiza totalPages com base na primeira resposta, se disponível
      if (currentPage === 0 && data.totalPages) {
        totalPages = data.totalPages;
      } else if (currentPage === 0 && data.count && data.limit) { // Fallback se totalPages não for direto
        totalPages = Math.ceil(data.count / data.limit);
      }
      currentPage++;
    }

    // Agrega vendas por dia de todas as vendas coletadas
    const dailySalesMap = new Map<string, number>();
    allVendas.forEach((venda: any) => {
      const saleDate = new Date(venda.dataCriacao);
      // Gerar dayKey com base na data local da venda
      const year = saleDate.getFullYear();
      const month = (saleDate.getMonth() + 1).toString().padStart(2, '0'); // Mês é 0-indexado
      const day = saleDate.getDate().toString().padStart(2, '0');
      const dayKey = `${year}-${month}-${day}`;
      const valor = venda.valorFinal || 0;
      dailySalesMap.set(dayKey, (dailySalesMap.get(dayKey) || 0) + valor);
    });

    // Gera dados para todos os dias do período, preenchendo dias ausentes com 0
    const evolucaoDiaria: DashboardEvolucao[] = [];
    
    const startDate = new Date(periodoInicial);
    const endDate = new Date(periodoFinal);
    endDate.setHours(23, 59, 59, 999); // Garante que o último dia seja incluído

    let currentDay = new Date(startDate);
    while (currentDay <= endDate) {
      const dayKey = currentDay.toISOString().split('T')[0];
      const valor = dailySalesMap.get(dayKey) || 0;
      const label = currentDay.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
      
      evolucaoDiaria.push(DashboardEvolucao.create({
        data: dayKey,
        valor: valor,
        label: label,
      }));
      currentDay.setDate(currentDay.getDate() + 1);
    }

    return evolucaoDiaria;
  }
}