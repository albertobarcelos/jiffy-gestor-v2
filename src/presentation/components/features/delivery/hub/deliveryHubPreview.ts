import type { EnderecoEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import { formatValorTaxaRaio } from '@/src/application/dto/delivery/CoberturaEntregaDTO'
import type { DeliveryHubPassoUi } from '@/src/presentation/components/features/delivery/hub/deliveryHubPassosUi'
import type { ResumoCoberturaHub } from '@/src/presentation/components/features/delivery/hub/deliveryHubResumoCobertura'

export type DeliveryHubPreviewFatoId =
  | 'areas'
  | 'raio'
  | 'taxa'
  | 'empresa'
  | 'endereco'
  | 'descricao'

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
  passo: Pick<DeliveryHubPassoUi, 'id' | 'descricao'>,
  resumo: ResumoCoberturaHub,
  endereco: EnderecoEmpresaMe | null,
  nomeEmpresa: string | null
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

  return [{ id: 'descricao', texto: passo.descricao }]
}

export function ctaPrimarioPreviewHub(
  passo: Pick<DeliveryHubPassoUi, 'id' | 'cta' | 'titulo'>
): string {
  if (passo.id === 'delivery-cobertura') return 'Editar áreas de entrega'
  if (passo.cta === 'Editar') return `Editar ${passo.titulo.toLowerCase()}`
  return passo.cta
}
