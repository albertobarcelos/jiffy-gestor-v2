'use client'

import { useRouter } from 'next/navigation'
import { useCliente } from '@/src/presentation/hooks/useClientes'
import { Button } from '@/src/presentation/components/ui/button'

interface VisualizarClienteProps {
  clienteId: string
}

/**
 * Componente para visualizar detalhes do cliente
 * Replica o design do Flutter
 */
export function VisualizarCliente({ clienteId }: VisualizarClienteProps) {
  const router = useRouter()
  const { data: cliente, isLoading, error } = useCliente(clienteId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !cliente) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-secondary-text">Cliente não encontrado</p>
      </div>
    )
  }

  const endereco = cliente.getEndereco()

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-primary-bg rounded-tl-[30px] shadow-md px-[30px] py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/25 text-primary flex items-center justify-center">
              <span className="text-2xl">👤</span>
            </div>
            <h1 className="text-primary text-lg font-semibold font-exo">
              Visualizar Cliente
            </h1>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => router.push(`/cadastros/clientes/${clienteId}/editar`)}
              className="px-6"
            >
              Editar
            </Button>
            <Button
              onClick={() => router.push('/cadastros/clientes')}
              variant="outline"
              className="px-6"
            >
              Voltar
            </Button>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto px-[30px] py-[30px] space-y-6">
        {/* Dados Pessoais */}
        <div className="bg-info rounded-[20px] p-5">
          <h2 className="text-primary text-base font-semibold font-nunito mb-4">
            Dados Pessoais
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-secondary-text text-sm mb-1">Nome</p>
              <p className="text-primary-text font-medium">{cliente.getNome()}</p>
            </div>
            {cliente.getRazaoSocial() && (
              <div>
                <p className="text-secondary-text text-sm mb-1">Razão Social</p>
                <p className="text-primary-text font-medium">
                  {cliente.getRazaoSocial()}
                </p>
              </div>
            )}
            {cliente.getCpf() && (
              <div>
                <p className="text-secondary-text text-sm mb-1">CPF</p>
                <p className="text-primary-text font-medium">{cliente.getCpf()}</p>
              </div>
            )}
            {cliente.getCnpj() && (
              <div>
                <p className="text-secondary-text text-sm mb-1">CNPJ</p>
                <p className="text-primary-text font-medium">{cliente.getCnpj()}</p>
              </div>
            )}
            {cliente.getTelefone() && (
              <div>
                <p className="text-secondary-text text-sm mb-1">Telefone</p>
                <p className="text-primary-text font-medium">
                  {cliente.getTelefone()}
                </p>
              </div>
            )}
            {cliente.getEmail() && (
              <div>
                <p className="text-secondary-text text-sm mb-1">Email</p>
                <p className="text-primary-text font-medium">{cliente.getEmail()}</p>
              </div>
            )}
            {cliente.getNomeFantasia() && (
              <div>
                <p className="text-secondary-text text-sm mb-1">Nome Fantasia</p>
                <p className="text-primary-text font-medium">
                  {cliente.getNomeFantasia()}
                </p>
              </div>
            )}
            <div>
              <p className="text-secondary-text text-sm mb-1">Status</p>
              <div
                className={`inline-block px-3 py-1 rounded-[24px] text-sm font-medium ${
                  cliente.isAtivo()
                    ? 'bg-success/20 text-success'
                    : 'bg-error/20 text-secondary-text'
                }`}
              >
                {cliente.isAtivo() ? 'Ativo' : 'Desativado'}
              </div>
            </div>
          </div>
        </div>

        {/* Endereço */}
        {endereco && (
          <div className="bg-info rounded-[20px] p-5">
            <h2 className="text-primary text-base font-semibold font-nunito mb-4">
              Endereço
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {endereco.cep && (
                <div>
                  <p className="text-secondary-text text-sm mb-1">CEP</p>
                  <p className="text-primary-text font-medium">{endereco.cep}</p>
                </div>
              )}
              {endereco.rua && (
                <div>
                  <p className="text-secondary-text text-sm mb-1">Rua</p>
                  <p className="text-primary-text font-medium">{endereco.rua}</p>
                </div>
              )}
              {endereco.numero && (
                <div>
                  <p className="text-secondary-text text-sm mb-1">Número</p>
                  <p className="text-primary-text font-medium">{endereco.numero}</p>
                </div>
              )}
              {endereco.bairro && (
                <div>
                  <p className="text-secondary-text text-sm mb-1">Bairro</p>
                  <p className="text-primary-text font-medium">{endereco.bairro}</p>
                </div>
              )}
              {endereco.cidade && (
                <div>
                  <p className="text-secondary-text text-sm mb-1">Cidade</p>
                  <p className="text-primary-text font-medium">{endereco.cidade}</p>
                </div>
              )}
              {endereco.estado && (
                <div>
                  <p className="text-secondary-text text-sm mb-1">Estado</p>
                  <p className="text-primary-text font-medium">{endereco.estado}</p>
                </div>
              )}
              {endereco.complemento && (
                <div className="col-span-2">
                  <p className="text-secondary-text text-sm mb-1">Complemento</p>
                  <p className="text-primary-text font-medium">
                    {endereco.complemento}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

