import { VisualizarCliente } from '@/src/presentation/components/features/clientes/VisualizarCliente'

export default async function VisualizarClientePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="h-full">
      <VisualizarCliente clienteId={id} />
    </div>
  )
}

