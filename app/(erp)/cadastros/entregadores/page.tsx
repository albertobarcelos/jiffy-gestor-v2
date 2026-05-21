import { Suspense } from 'react'
import { UsuariosList } from '@/src/presentation/components/features/usuarios/UsuariosList'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'

export default function EntregadoresPage() {
  return (
    <div className="h-full px-2 pt-4">
      <Suspense fallback={<PageLoading />}>
        <UsuariosList
          tipoUsuarioPdv="entregador"
          title="Entregadores Cadastrados"
          createLabel="Novo"
          emptyMessage="Nenhum entregador encontrado."
        />
      </Suspense>
    </div>
  )
}
