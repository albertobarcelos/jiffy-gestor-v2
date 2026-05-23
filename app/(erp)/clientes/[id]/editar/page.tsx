import { NovoCliente } from '@/src/presentation/components/features/clientes/NovoCliente'

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="h-full">
      <NovoCliente clienteId={id} />
    </div>
  )
}

