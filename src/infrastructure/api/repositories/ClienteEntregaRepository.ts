import { Cliente } from '@/src/domain/entities/Cliente'
import type { IClienteEntregaRepository } from '@/src/domain/repositories/IClienteEntregaRepository'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { mensagemErroRespostaGestor } from '@/src/infrastructure/api/mensagemErroRespostaGestor'

export class ClienteEntregaRepository implements IClienteEntregaRepository {
  async buscarPorTelefone(telefone: string, token: string): Promise<Cliente | null> {
    const params = new URLSearchParams({ q: telefone, limit: '1', offset: '0' })
    const response = await fetchGestorApi(`/api/clientes?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(mensagemErroRespostaGestor(err, response.status, 'Erro ao buscar cliente'))
    }

    const data: { items?: unknown[] } = await response.json()
    const itens = (data.items || []).map(item => Cliente.fromJSON(item))
    return itens.length > 0 ? itens[0] : null
  }

  async criarRapido(
    input: { nome: string; telefone: string },
    token: string
  ): Promise<Cliente> {
    const response = await fetchGestorApi('/api/clientes', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nome: input.nome,
        telefone: input.telefone.replace(/\D/g, ''),
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(mensagemErroRespostaGestor(err, response.status, 'Erro ao criar cliente'))
    }

    return Cliente.fromJSON(await response.json())
  }

  async atualizarNome(clienteId: string, nome: string, token: string): Promise<void> {
    const response = await fetchGestorApi(`/api/clientes/${encodeURIComponent(clienteId)}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ nome }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(
        mensagemErroRespostaGestor(err, response.status, 'Erro ao atualizar nome do cliente')
      )
    }
  }
}

export const clienteEntregaRepository = new ClienteEntregaRepository()
