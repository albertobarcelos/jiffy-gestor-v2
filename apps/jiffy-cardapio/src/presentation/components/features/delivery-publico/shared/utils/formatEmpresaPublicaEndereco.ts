import type { EmpresaPublicaDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { formatarEnderecoEmpresa } from '@/src/shared/utils/formatarResumoEndereco'

export function formatEmpresaPublicaEndereco(
  endereco: EmpresaPublicaDTO['endereco']
): string | null {
  return formatarEnderecoEmpresa(endereco)
}
