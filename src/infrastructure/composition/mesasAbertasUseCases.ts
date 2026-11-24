import { ListarMesasAbertasUseCase } from '@/src/application/use-cases/vendas/ListarMesasAbertasUseCase'
import { ListarUsuariosPdvMesasUseCase } from '@/src/application/use-cases/vendas/ListarUsuariosPdvMesasUseCase'
import { mesasAbertasHttpRepository } from '@/src/infrastructure/api/repositories/MesasAbertasHttpRepository'

export const listarMesasAbertasUseCase = new ListarMesasAbertasUseCase(
  mesasAbertasHttpRepository
)

export const listarUsuariosPdvMesasUseCase = new ListarUsuariosPdvMesasUseCase(
  mesasAbertasHttpRepository
)
