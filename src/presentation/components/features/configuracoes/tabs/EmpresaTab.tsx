'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { Cliente } from '@/src/domain/entities/Cliente'
import { showToast } from '@/src/shared/utils/toast'

/**
 * Tab de Empresa - Edição de dados da empresa
 */
export function EmpresaTab() {
  const { auth } = useAuthStore()
  const [empresa, setEmpresa] = useState<Cliente | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(true)

  // Campos do formulário
  const [cnpj, setCnpj] = useState('')
  const [razaoSocial, setRazaoSocial] = useState('')
  const [nomeFantasia, setNomeFantasia] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [cep, setCep] = useState('')
  const [rua, setRua] = useState('')
  const [numero, setNumero] = useState('')
  const [complemento, setComplemento] = useState('')
  const [bairro, setBairro] = useState('')
  const [cidade, setCidade] = useState('')
  const [estado, setEstado] = useState('')

  useEffect(() => {
    loadEmpresa()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadEmpresa = async () => {
    const token = auth?.getAccessToken()
    if (!token) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/empresas/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        
        // Debug: log da resposta da API
        if (process.env.NODE_ENV === 'development') {
          console.log('Resposta da API de empresa:', data)
        }
        
        try {
          const empresaData = Cliente.fromJSON(data)
          setEmpresa(empresaData)

          // Preencher campos
          setCnpj(empresaData.getCnpj() || '')
          setRazaoSocial(empresaData.getRazaoSocial() || '')
          setNomeFantasia(empresaData.getNomeFantasia() || '')
          setEmail(empresaData.getEmail() || '')
          setTelefone(empresaData.getTelefone() || '')
          
          const endereco = empresaData.getEndereco()
          if (endereco) {
            setCep(endereco.cep || '')
            setRua(endereco.rua || '')
            setNumero(endereco.numero || '')
            setComplemento(endereco.complemento || '')
            setBairro(endereco.bairro || '')
            setCidade(endereco.cidade || '')
            setEstado(endereco.estado || '')
          }
        } catch (error) {
          console.error('Erro ao criar Cliente a partir dos dados da API:', error, 'Dados:', data)
          // Criar um Cliente vazio para evitar quebra da UI
          const empresaData = Cliente.create(
            data.id || `temp-${Date.now()}`,
            data.nome || data.razaoSocial || data.nomeFantasia || 'Empresa',
            data.razaoSocial,
            data.cpf,
            data.cnpj,
            data.telefone,
            data.email,
            data.nomeFantasia
          )
          setEmpresa(empresaData)
        }
      } else {
        console.error('Erro na resposta da API:', response.status, await response.text().catch(() => ''))
      }
    } catch (error) {
      console.error('Erro ao carregar empresa:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    const token = auth?.getAccessToken()
    if (!token || !empresa) {
      console.error('Token ou empresa não disponível')
      return
    }

    try {
      // Monta o body apenas com campos que têm valor
      const body: Record<string, any> = {}
      
      if (cnpj) body.cnpj = cnpj
      if (razaoSocial) body.razaoSocial = razaoSocial
      if (nomeFantasia) body.nomeFantasia = nomeFantasia
      if (email) body.email = email
      if (telefone) body.telefone = telefone

      // Monta o endereço apenas se houver pelo menos um campo preenchido
      const endereco: Record<string, any> = {}
      if (cep) endereco.cep = cep
      if (rua) endereco.rua = rua
      if (numero) endereco.numero = numero
      if (complemento) endereco.complemento = complemento
      if (bairro) endereco.bairro = bairro
      if (cidade) endereco.cidade = cidade
      if (estado) endereco.estado = estado

      // Adiciona endereco ao body apenas se houver pelo menos um campo
      if (Object.keys(endereco).length > 0) {
        body.endereco = endereco
      }

      console.log('Enviando dados:', body)

      const response = await fetch(`/api/empresas/${empresa.getId()}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      const responseData = await response.json().catch(() => ({}))
      
      if (response.ok) {
        setIsEditing(false)
        await loadEmpresa()
        showToast.success('Empresa atualizada com sucesso!')
      } else {
        console.error('Erro na resposta:', response.status, responseData)
        const errorMessage = responseData.error || responseData.message || 'Erro desconhecido'
        showToast.error(`Erro ao atualizar empresa: ${errorMessage}`)
      }
    } catch (error) {
      console.error('Erro ao salvar empresa:', error)
      showToast.error('Erro ao salvar empresa')
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <img
          src="/images/jiffy-loading.gif"
          alt="Carregando"
          className="w-20 object-contain"
        />
        <span className="text-sm font-medium font-nunito text-primary-text">Carregando...</span>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto md:px-6 px-1 py-2 scrollbar-hide">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
        <div>
          <h3 className="text-primary text-lg md:text-xl font-semibold font-exo mb-1">
            Dados da Empresa
          </h3>
          <p className="text-secondary-text text-xs md:text-sm font-nunito">
            Gerencie as informações da sua empresa
          </p>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="h-8 px-6 bg-primary text-white rounded-lg text-sm font-medium font-exo hover:bg-primary/90 transition-colors"
          >
            Editar
          </button>
        )}
        {isEditing && (
          <div className="flex flex-col md:flex-row gap-2">
            <button
              onClick={handleSave}
              className="h-8 px-6 bg-primary text-white rounded-lg text-sm font-medium font-exo hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <span>✓</span> Salvar
            </button>
            <button
              onClick={() => {
                setIsEditing(false)
                loadEmpresa()
              }}
              className="h-8 px-6 bg-primary/10 text-primary border border-primary rounded-lg text-sm font-medium font-exo hover:bg-primary/15 transition-colors"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      <div className="bg-info md:px-[18px] px-1 space-y-4">
        {/* Dados Básicos */}
        <div>
          <h4 className="text-primary text-lg font-bold font-nunito mb-2">
            Dados Básicos
          </h4>
          <div className="grid md:grid-cols-2 grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary-text">
                CNPJ
              </label>
              <input
                type="text"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                disabled={!isEditing}
                className="w-full h-8 px-4 rounded-lg border border-primary bg-primary-bg text-primary-text focus:outline-none focus:border-primary disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-text">
                Razão Social
              </label>
              <input
                type="text"
                value={razaoSocial}
                onChange={(e) => setRazaoSocial(e.target.value)}
                disabled={!isEditing}
                className="w-full h-8 px-4 rounded-lg border border-primary bg-primary-bg text-primary-text focus:outline-none focus:border-primary disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-text">
                Nome Fantasia
              </label>
              <input
                type="text"
                value={nomeFantasia}
                onChange={(e) => setNomeFantasia(e.target.value)}
                disabled={!isEditing}
                className="w-full h-8 px-4 rounded-lg border border-primary bg-primary-bg text-primary-text focus:outline-none focus:border-primary disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-text">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!isEditing}
                className="w-full h-8 px-4 rounded-lg border border-primary bg-primary-bg text-primary-text focus:outline-none focus:border-primary disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-text">
                Telefone
              </label>
              <input
                type="text"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                disabled={!isEditing}
                className="w-full h-8 px-4 rounded-lg border border-primary bg-primary-bg text-primary-text focus:outline-none focus:border-primary disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* Endereço */}
        <div>
          <h4 className="text-primary text-lg font-bold font-nunito mb-2">
            Endereço
          </h4>
          <div className="grid md:grid-cols-3 grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary-text">
                CEP
              </label>
              <input
                type="text"
                value={cep}
                onChange={(e) => setCep(e.target.value)}
                disabled={!isEditing}
                className="w-full h-8 px-4 rounded-lg border border-primary bg-primary-bg text-primary-text focus:outline-none focus:border-primary disabled:opacity-50"
              />
            </div>
            <div className="md:col-span-2 col-span-1">
              <label className="block text-sm font-medium text-primary-text">
                Rua
              </label>
              <input
                type="text"
                value={rua}
                onChange={(e) => setRua(e.target.value)}
                disabled={!isEditing}
                className="w-full h-8 px-4 rounded-lg border border-primary bg-primary-bg text-primary-text focus:outline-none focus:border-primary disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-text">
                Número
              </label>
              <input
                type="text"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                disabled={!isEditing}
                className="w-full h-8 px-4 rounded-lg border border-primary bg-primary-bg text-primary-text focus:outline-none focus:border-primary disabled:opacity-50"
              />
            </div>
            <div className="md:col-span-2 col-span-1">
              <label className="block text-sm font-medium text-primary-text">
                Complemento
              </label>
              <input
                type="text"
                value={complemento}
                onChange={(e) => setComplemento(e.target.value)}
                disabled={!isEditing}
                className="w-full h-8 px-4 rounded-lg border border-primary bg-primary-bg text-primary-text focus:outline-none focus:border-primary disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-text">
                Bairro
              </label>
              <input
                type="text"
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
                disabled={!isEditing}
                className="w-full h-8 px-4 rounded-lg border border-primary bg-primary-bg text-primary-text focus:outline-none focus:border-primary disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-text">
                Cidade
              </label>
              <input
                type="text"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                disabled={!isEditing}
                className="w-full h-8 px-4 rounded-lg border border-primary bg-primary-bg text-primary-text focus:outline-none focus:border-primary disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-text">
                Estado
              </label>
              <input
                type="text"
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                disabled={!isEditing}
                className="w-full h-8 px-4 rounded-lg border border-primary bg-primary-bg text-primary-text focus:outline-none focus:border-primary disabled:opacity-50"
              />
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}

