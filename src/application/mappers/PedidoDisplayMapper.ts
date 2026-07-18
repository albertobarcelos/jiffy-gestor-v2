import {
  normalizeOrigemApi,
  rotuloOrigemParaExibicao as rotuloOrigemNormalizado,
} from '@/src/application/mappers/VendaApiNormalizer'
import { pagamentoEstaCancelado } from '@/src/domain/services/pedido/RegrasPagamentoPedido'
import type { PagamentoSelecionado } from '@/src/domain/types/pedido'
import type {
  EnderecoEntregaDetalhe,
  FluxoPagamentoEntrega,
  OrigemVenda,
  TaxaEntregaDetalhe,
} from '@/src/domain/types/vendaDetalhe'
import { formatarTelefoneBr } from '@/src/shared/utils/telefoneBr'

export {
  formatarDataDetalhePedido,
  formatarHoraDetalhePedido,
  formatarHoraPrevisaoEntrega,
  formatarEnderecoEntregaMultilinha,
  formatarTaxaEntregaDetalheExibicao,
  taxaEntregaTemValor,
} from '@/src/application/mappers/VendaDetalheMapper'

type MeioPagamentoLookup = {
  getId(): string
  getNome(): string
}

export function formatarDataHoraResumoFiscal(valor: string | null | undefined): string {
  if (valor == null || String(valor).trim() === '') return '—'
  try {
    const d = new Date(valor)
    if (Number.isNaN(d.getTime())) return String(valor)
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return String(valor)
  }
}

export function formatarUsuarioPorId(
  usuarioId: string | null | undefined,
  nomesUsuariosPedido: Record<string, string>
): string {
  const id = String(usuarioId || '').trim()
  if (!id) return '—'
  return nomesUsuariosPedido[id] || 'Usuário não identificado'
}

export function rotuloModeloNfe(modelo: number | null | undefined): string {
  if (modelo === 55) return 'NF-e'
  if (modelo === 65) return 'NFC-e'
  if (modelo == null || modelo === undefined) return '—'
  return String(modelo)
}

/** Compat: aceita texto bruto da API (PDV sem `origem`). */
export function rotuloOrigemParaExibicao(
  origemBrutaApi: string | null,
  tipoVenda?: string | null
): string {
  const origem = normalizeOrigemApi(origemBrutaApi)
  return rotuloOrigemNormalizado(origem, origemBrutaApi, tipoVenda)
}

export function rotuloOrigemExibicao(
  origem: OrigemVenda | null,
  origemBrutaApi?: string | null,
  tipoVenda?: string | null
): string {
  return rotuloOrigemNormalizado(origem, origemBrutaApi, tipoVenda)
}

export function rotuloCobrancaEntrega(fluxo: FluxoPagamentoEntrega | null | undefined): string {
  return fluxo === 'cobrar_entregador' ? 'Cobrar na entrega' : 'Já foi Pago'
}

export function formatarTipoPagamentoDetalhe(
  pagamentos: PagamentoSelecionado[],
  meiosPagamento: MeioPagamentoLookup[],
  nomesMeiosPorId: Record<string, string>
): string {
  const comMeio = pagamentos.filter(p => String(p.meioPagamentoId ?? '').trim())
  const preferidos = comMeio.filter(p => !pagamentoEstaCancelado(p))
  const base = preferidos.length > 0 ? preferidos : comMeio

  const nomesUnicos: string[] = []
  const idsVistos = new Set<string>()

  for (const pag of base) {
    const meioId = String(pag.meioPagamentoId).trim()
    if (idsVistos.has(meioId)) continue
    idsVistos.add(meioId)

    const meioLista = meiosPagamento.find(m => m.getId() === meioId)
    const nome = meioLista?.getNome()?.trim() || nomesMeiosPorId[meioId]?.trim() || ''
    if (nome) nomesUnicos.push(nome)
  }

  return nomesUnicos.length > 0 ? nomesUnicos.join(', ') : '—'
}

export function formatarCpfCnpjExibicao(valor: string | null | undefined): string {
  const digits = String(valor ?? '').replace(/\D/g, '')
  if (!digits) return '—'
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }
  return String(valor).trim() || '—'
}

export function formatarCelularExibicao(valor: string | null | undefined): string {
  const digits = String(valor ?? '').replace(/\D/g, '')
  if (!digits) return '—'
  return formatarTelefoneBr(digits)
}

export function formatarEnderecoEntregaCompleto(
  endereco: EnderecoEntregaDetalhe | null | undefined
): string {
  if (!endereco) return '—'

  const partes: string[] = []
  const ruaNumero = [endereco.rua, endereco.numero].filter(Boolean).join(', ')
  if (ruaNumero) partes.push(ruaNumero)
  if (endereco.bairro) partes.push(endereco.bairro)
  const cidadeUf = [endereco.cidade, endereco.estado].filter(Boolean).join(' - ')
  if (cidadeUf) partes.push(cidadeUf)
  if (endereco.cep) partes.push(`CEP ${endereco.cep}`)
  if (endereco.complemento) partes.push(endereco.complemento)
  if (endereco.referencia) partes.push(`Ref.: ${endereco.referencia}`)

  return partes.length > 0 ? partes.join(' · ') : '—'
}

export function formatarPrevisaoEntregaExibicao(
  valor: string | Date | null | undefined,
  formatarData: (v: string | null | undefined) => string
): string {
  if (valor == null || String(valor).trim() === '') return '—'
  if (valor instanceof Date) {
    return formatarData(valor.toISOString())
  }
  const str = String(valor).trim()
  const asNumber = Number(str)
  if (!Number.isNaN(asNumber) && /^\d+$/.test(str)) {
    return `${asNumber} min`
  }
  return formatarData(str)
}
