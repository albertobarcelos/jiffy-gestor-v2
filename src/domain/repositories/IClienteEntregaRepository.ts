import type { Cliente } from '../entities/Cliente'

export interface IClienteEntregaRepository {
  buscarPorTelefone(telefone: string, token: string): Promise<Cliente | null>
  criarRapido(input: { nome: string; telefone: string }, token: string): Promise<Cliente>
  atualizarNome(clienteId: string, nome: string, token: string): Promise<void>
}
