import type { EnderecoEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import { formatValorTaxaRaio } from '@/src/application/dto/delivery/CoberturaEntregaDTO'
import type { DeliveryHubPassoUi } from '@/src/presentation/components/features/delivery/hub/deliveryHubPassosUi'
import type { ResumoCoberturaHub } from '@/src/presentation/components/features/delivery/hub/deliveryHubResumoCobertura'
import {
  textoQuantidadeCadastrada,
  type DeliveryHubPassosExtras,
} from '@/src/presentation/components/features/delivery/hub/deliveryHubCadastros'

export type DeliveryHubPreviewFatoId =
  | 'areas'
  | 'raio'
  | 'taxa'
  | 'empresa'
  | 'endereco'
  | 'descricao'
  | 'whatsapp'
  | 'entregadores'
  | 'meios'
  | 'impressoras'

export type DeliveryHubPreviewFato = {
  id: DeliveryHubPreviewFatoId
  texto: string
}

export function linhaEnderecoHub(endereco: EnderecoEmpresaMe | null): string {
  if (!endereco) return 'Endereço ainda não preenchido.'
  const ruaNumero = [endereco.rua, endereco.numero].filter(Boolean).join(', ')
  const cidadeUf = [endereco.cidade, endereco.estado].filter(Boolean).join(' / ')
  const partes = [ruaNumero, endereco.bairro, cidadeUf].filter(Boolean)
  return partes.length > 0 ? partes.join(' · ') : 'Endereço ainda não preenchido.'
}

export function fatosPreviewHub(
  passo: Pick<DeliveryHubPassoUi, 'descricao' | 'concluido'> & { id: string },
  resumo: ResumoCoberturaHub,
  endereco: EnderecoEmpresaMe | null,
  nomeEmpresa: string | null,
  extras?: DeliveryHubPassosExtras
): DeliveryHubPreviewFato[] {
  if (passo.id === 'delivery-cobertura') {
    const fatos: DeliveryHubPreviewFato[] = [
      {
        id: 'areas',
        texto:
          resumo.qtdAreas === 1
            ? '1 área configurada'
            : `${resumo.qtdAreas} áreas configuradas`,
      },
      {
        id: 'raio',
        texto:
          resumo.raioMaximoKm != null
            ? `Raio máximo: ${resumo.raioMaximoKm} km`
            : 'Raio ainda não definido',
      },
    ]
    if (resumo.taxaMinima != null) {
      fatos.push({
        id: 'taxa',
        texto: `Taxa a partir de ${formatValorTaxaRaio(resumo.taxaMinima)}`,
      })
    }
    return fatos
  }

  if (passo.id === 'delivery-geolocalizacao') {
    return [
      {
        id: 'empresa',
        texto: nomeEmpresa?.trim() || 'Empresa da sessão',
      },
      { id: 'endereco', texto: linhaEnderecoHub(endereco) },
    ]
  }

  if (passo.id === 'delivery-notificacoes') {
    return [
      {
        id: 'whatsapp',
        texto: passo.concluido ? 'WhatsApp conectado' : 'WhatsApp desconectado',
      },
    ]
  }

  if (passo.id === 'delivery-entregadores') {
    return [
      {
        id: 'entregadores',
        texto: textoQuantidadeCadastrada(extras?.qtdEntregadores ?? 0, {
          nenhum: 'Nenhum entregador cadastrado',
          um: '1 entregador cadastrado',
          muitos: n => `${n} entregadores cadastrados`,
        }),
      },
    ]
  }

  if (passo.id === 'delivery-meios') {
    return [
      {
        id: 'meios',
        texto: textoQuantidadeCadastrada(extras?.qtdMeiosPagamento ?? 0, {
          nenhum: 'Nenhum meio de pagamento cadastrado',
          um: '1 meio de pagamento cadastrado',
          muitos: n => `${n} meios de pagamento cadastrados`,
        }),
      },
    ]
  }

  if (passo.id === 'delivery-impressoras') {
    return [
      {
        id: 'impressoras',
        texto: textoQuantidadeCadastrada(extras?.qtdImpressoras ?? 0, {
          nenhum: 'Nenhuma impressora cadastrada',
          um: '1 impressora cadastrada',
          muitos: n => `${n} impressoras cadastradas`,
        }),
      },
    ]
  }

  return [{ id: 'descricao', texto: passo.descricao }]
}

export function ctaPrimarioPreviewHub(
  passo: Pick<DeliveryHubPassoUi, 'cta' | 'titulo' | 'concluido'> & { id: string }
): string {
  if (passo.id === 'delivery-cobertura') return 'Editar áreas de entrega'
  if (passo.id === 'delivery-notificacoes') {
    return passo.concluido ? 'Editar notificações' : 'Conectar WhatsApp'
  }
  if (passo.cta === 'Editar') return `Editar ${passo.titulo.toLowerCase()}`
  return passo.cta
}
