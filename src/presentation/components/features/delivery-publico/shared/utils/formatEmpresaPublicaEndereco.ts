import type { EmpresaPublicaDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'

export function formatEmpresaPublicaEndereco(
  endereco: EmpresaPublicaDTO['endereco']
): string | null {
  if (!endereco) return null

  const linha1 = [endereco.rua, endereco.numero].filter(Boolean).join(', ')
  const linha2 = [endereco.bairro, endereco.cidade, endereco.estado].filter(Boolean).join(', ')
  const cep = endereco.cep?.trim()

  const partes = [linha1, linha2, cep ? `${cep}, Brasil` : 'Brasil'].filter(
    parte => parte.trim().length > 0
  )

  return partes.length > 0 ? partes.join(' - ') : null
}
