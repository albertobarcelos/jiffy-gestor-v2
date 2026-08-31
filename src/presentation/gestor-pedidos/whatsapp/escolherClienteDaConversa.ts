import { telefonesCorrespondem } from '@/src/shared/utils/telefoneClienteMatch'
import { nomesCorrespondem, tituloConversaGenerico } from '@/src/shared/utils/nomeClienteMatch'

export type ClienteIdentificavel = {
  getNome(): string
  getTelefone(): string | null | undefined
}

export function escolherClienteDaConversa<T extends ClienteIdentificavel>(
  clientes: T[],
  telefone: string | null | undefined,
  titulo: string | null | undefined
): T | null {
  const porTel = telefone
    ? clientes.filter(c => telefonesCorrespondem(c.getTelefone(), telefone))
    : []
  if (porTel.length === 1) return porTel[0]
  if (!tituloConversaGenerico(titulo)) {
    const porNome = clientes.filter(c => nomesCorrespondem(c.getNome(), titulo))
    if (porNome.length === 1) return porNome[0]
  }
  return null
}
