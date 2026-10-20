import type { IdentificacaoClienteEntregaDTO } from '@/src/application/dto/IdentificacaoClienteEntregaDTO'
import type { Cliente } from '@/src/domain/entities/Cliente'
import { clienteCadastradoNestaEmpresa } from '@/src/domain/policies/pedido/ClienteEntregaPolicy'
import type { IClienteEntregaRepository } from '@/src/domain/repositories/IClienteEntregaRepository'
import type { IMoradaEntregaRepository } from '@/src/domain/repositories/IMoradaEntregaRepository'
import { clienteEntregaRepository } from '@/src/infrastructure/api/repositories/ClienteEntregaRepository'
import { moradaEntregaRepository } from '@/src/infrastructure/api/repositories/MoradaEntregaRepository'

function snapshotCliente(cliente: Cliente): { id: string; nome: string } {
  return { id: cliente.getId(), nome: cliente.getNome() }
}

/**
 * Identifica cliente + moradas numa só orquestração.
 *
 * Delivery: usa o GET indexado por telefone. Se já houver `clienteIdVinculado`,
 * não dispara a busca genérica ERP (`/api/clientes?q=`), que é o caminho pesado.
 * Sem vínculo: cai no ERP e reaproveita as moradas já lidas do índice.
 *
 * Legado: ERP e moradas em paralelo (antes era cascata).
 */
export class IdentificarClienteEMoradasEntregaPorTelefoneUseCase {
  constructor(
    private readonly clienteRepo: IClienteEntregaRepository = clienteEntregaRepository,
    private readonly moradaRepo: IMoradaEntregaRepository = moradaEntregaRepository
  ) {}

  async execute(
    telefone: string,
    token: string,
    usarModuloDelivery: boolean
  ): Promise<IdentificacaoClienteEntregaDTO> {
    if (usarModuloDelivery) {
      const delivery = await this.moradaRepo.identificarClienteDeliveryPorTelefone(
        telefone,
        token
      )
      const idVinculado = delivery?.clienteIdVinculado?.trim() ?? ''

      if (clienteCadastradoNestaEmpresa(idVinculado) && delivery) {
        return {
          cliente: {
            id: idVinculado,
            nome: (delivery.nome ?? '').trim(),
          },
          moradas: delivery.moradas,
        }
      }

      const erp = await this.clienteRepo.buscarPorTelefone(telefone, token)
      return {
        cliente: erp ? snapshotCliente(erp) : null,
        moradas: delivery?.moradas ?? [],
      }
    }

    const [erp, moradas] = await Promise.all([
      this.clienteRepo.buscarPorTelefone(telefone, token),
      this.moradaRepo.listarPorTelefone(telefone, token, false),
    ])

    return {
      cliente: erp ? snapshotCliente(erp) : null,
      moradas: erp ? moradas : [],
    }
  }
}

export const identificarClienteEMoradasEntregaPorTelefoneUseCase =
  new IdentificarClienteEMoradasEntregaPorTelefoneUseCase()
