import type {
  EmpresaPublicaDTO,
  MeioPagamentoPublicoDTO,
} from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import type { HorarioFuncionamentoPublicoDTO } from '@/src/application/dto/delivery-publico/HorarioFuncionamentoPublicoDTO'
import type { DeliveryLojaInformacoesData } from '../types/deliveryLojaInformacoes'
import {
  buildEnderecoDetalheInformacoes,
  buildEnderecoTituloInformacoes,
  formatarHorariosInformacoesLoja,
} from '../types/deliveryLojaInformacoes'

type BuildLojaInformacoesParams = {
  nomeLoja: string
  empresa?: EmpresaPublicaDTO | null
  horario?: HorarioFuncionamentoPublicoDTO | null
  meiosPagamento?: MeioPagamentoPublicoDTO[] | null
  instagramUrl?: string | null
}

export function buildLojaInformacoesData({
  nomeLoja,
  empresa = null,
  horario = null,
  meiosPagamento = null,
  instagramUrl = null,
}: BuildLojaInformacoesParams): DeliveryLojaInformacoesData {
  const nome =
    nomeLoja.trim() ||
    empresa?.nomeExibicao?.trim() ||
    empresa?.nomeFantasia?.trim() ||
    'Sua loja'

  return {
    nomeLoja: nome,
    enderecoTitulo: buildEnderecoTituloInformacoes({
      nomeLoja: nome,
      cidade: empresa?.endereco?.cidade,
      estado: empresa?.endereco?.estado,
    }),
    enderecoDetalhe: buildEnderecoDetalheInformacoes(empresa?.endereco ?? null),
    telefone: empresa?.telefone ?? null,
    instagramUrl: instagramUrl ?? null,
    horarios: formatarHorariosInformacoesLoja(horario?.turnos),
    meiosPagamento: meiosPagamento ?? [],
  }
}

/** Dados de demonstração para o preview do Design. */
export function buildMockLojaInformacoesData(
  nomeLoja: string
): DeliveryLojaInformacoesData {
  const nome = nomeLoja.trim() || 'Sua loja'
  return {
    nomeLoja: nome,
    enderecoTitulo: `${nome} • Sua cidade - UF`,
    enderecoDetalhe: 'Rua Exemplo, 100, Centro',
    telefone: null,
    instagramUrl: null,
    horarios: formatarHorariosInformacoesLoja([
      { diaSemana: 1, horaInicio: '18:00', horaFim: '22:45' },
      { diaSemana: 2, horaInicio: '18:00', horaFim: '22:45' },
      { diaSemana: 3, horaInicio: '18:00', horaFim: '22:45' },
      { diaSemana: 4, horaInicio: '18:00', horaFim: '22:45' },
      { diaSemana: 5, horaInicio: '18:00', horaFim: '23:45' },
      { diaSemana: 6, horaInicio: '18:00', horaFim: '23:45' },
      { diaSemana: 0, horaInicio: '18:00', horaFim: '23:45' },
    ]),
    meiosPagamento: [
      {
        id: 'mock-pix',
        nome: 'Pix',
        formaPagamentoFiscal: '17',
        formaPagamentoFiscalLabel: 'Pagamento Instantâneo (PIX)',
        isParcelavel: false,
        tipoParcelamento: 'NAO_PARCELAVEL',
      },
      {
        id: 'mock-dinheiro',
        nome: 'Dinheiro',
        formaPagamentoFiscal: '01',
        formaPagamentoFiscalLabel: 'Dinheiro',
        isParcelavel: false,
        tipoParcelamento: 'NAO_PARCELAVEL',
      },
      {
        id: 'mock-credito',
        nome: 'Crédito - Visa',
        formaPagamentoFiscal: '03',
        formaPagamentoFiscalLabel: 'Cartão de Crédito',
        isParcelavel: true,
        tipoParcelamento: 'PARCELADO',
      },
    ],
  }
}
