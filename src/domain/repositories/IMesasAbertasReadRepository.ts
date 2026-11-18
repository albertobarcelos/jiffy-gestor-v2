import type {
  ListarMesasAbertasApiParams,
  MesasAbertasApiPage,
  UsuarioPdvResumo,
} from '@/src/domain/types/mesasAbertas'

export type { ListarMesasAbertasApiParams, MesasAbertasApiPage }

export interface IMesasAbertasReadRepository {
  listarMesasAbertas(
    params: ListarMesasAbertasApiParams,
    token: string
  ): Promise<MesasAbertasApiPage>

  listarTodosUsuariosPdv(token: string): Promise<UsuarioPdvResumo[]>
}
