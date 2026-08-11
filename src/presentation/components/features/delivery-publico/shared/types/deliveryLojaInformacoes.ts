import type { MeioPagamentoPublicoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import type { TurnoHorarioFuncionamentoPublicoDTO } from '@/src/application/dto/delivery-publico/HorarioFuncionamentoPublicoDTO'

export type DeliveryLojaInformacoesHorarioDia = {
  diaLabel: string
  horarioLabel: string
}

export type DeliveryLojaInformacoesData = {
  nomeLoja: string
  /** Ex.: "Pizzaria Nápolis • Barra do Bugres - MT" */
  enderecoTitulo: string
  /** Ex.: "Rua João Campos Borges, 237, Centro" */
  enderecoDetalhe: string | null
  telefone: string | null
  /** Quando null/undefined, a linha do Instagram não aparece. */
  instagramUrl?: string | null
  horarios: DeliveryLojaInformacoesHorarioDia[]
  meiosPagamento: MeioPagamentoPublicoDTO[]
}

const DIAS_LONGOS = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
] as const

/** Ordem visual Segunda → Domingo (como no modal de referência). */
const ORDEM_DIAS = [1, 2, 3, 4, 5, 6, 0] as const

export function formatarHorariosInformacoesLoja(
  turnos: TurnoHorarioFuncionamentoPublicoDTO[] | null | undefined
): DeliveryLojaInformacoesHorarioDia[] {
  const lista = turnos ?? []

  return ORDEM_DIAS.map(diaSemana => {
    const doDia = lista
      .filter(t => t.diaSemana === diaSemana)
      .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))

    const horarioLabel =
      doDia.length === 0
        ? 'Fechado'
        : doDia.map(t => `${t.horaInicio} às ${t.horaFim}`).join(' · ')

    return {
      diaLabel: DIAS_LONGOS[diaSemana],
      horarioLabel,
    }
  })
}

export function buildEnderecoTituloInformacoes(params: {
  nomeLoja: string
  cidade?: string | null
  estado?: string | null
}): string {
  const local = [params.cidade?.trim(), params.estado?.trim()]
    .filter(Boolean)
    .join(' - ')
  return local ? `${params.nomeLoja} • ${local}` : params.nomeLoja
}

export function buildEnderecoDetalheInformacoes(endereco: {
  rua: string
  numero: string
  bairro: string | null
} | null): string | null {
  if (!endereco) return null
  const linha = [endereco.rua, endereco.numero].filter(Boolean).join(', ')
  const comBairro = endereco.bairro?.trim()
    ? `${linha}, ${endereco.bairro.trim()}`
    : linha
  return comBairro.trim() || null
}
