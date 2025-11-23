'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { Cliente } from '@/src/domain/entities/Cliente'

/**
 * Tab de Empresa - Edição de dados da empresa
 */
export function EmpresaTab() {
  const { auth } = useAuthStore()
  const [empresa, setEmpresa] = useState<Cliente | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)

  // Campos do formulário
  const [cnpj, setCnpj] = useState('')
  const [razaoSocial, setRazaoSocial] = useState('')
  const [nomeFantasia, setNomeFantasia] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [regimeTributario, setRegimeTributario] = useState('')
  const [inscricaoEstadual, setInscricaoEstadual] = useState('')
  const [inscricaoMunicipal, setInscricaoMunicipal] = useState('')
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
    if (!token || !empresa) return

    try {
      const response = await fetch(`/api/empresas/${empresa.getId()}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          cnpj,
          razaoSocial,
          nomeFantasia,
          email,
          telefone,
          parametroFiscal: {
            regimeTributario,
            inscricaoEstadual,
            inscricaoMunicipal,
          },
          endereco: {
            cep,
            rua,
            numero,
            complemento,
            bairro,
            cidade,
            estado,
          },
        }),
      })

      if (response.ok) {
        setIsEditing(false)
        await loadEmpresa()
        alert('Empresa atualizada com sucesso!')
      } else {
        alert('Erro ao atualizar empresa')
      }
    } catch (error) {
      console.error('Erro ao salvar empresa:', error)
      alert('Erro ao salvar empresa')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-primary text-base font-semibold font-exo mb-1">
            Dados da Empresa
          </h3>
          <p className="text-secondary-text text-sm font-nunito">
            Gerencie as informações da sua empresa
          </p>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="h-9 px-4 bg-alternate text-white rounded-[50px] text-sm font-medium font-exo hover:bg-alternate/90 transition-colors"
          >
            Editar
          </button>
        )}
        {isEditing && (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="h-9 px-4 bg-alternate text-white rounded-[50px] text-sm font-medium font-exo hover:bg-alternate/90 transition-colors flex items-center gap-2"
            >
              <span>✓</span> Salvar
            </button>
            <button
              onClick={() => {
                setIsEditing(false)
                loadEmpresa()
              }}
              className="h-9 px-4 bg-secondary-bg text-primary-text rounded-[50px] text-sm font-medium font-exo hover:bg-secondary-bg/80 transition-colors"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      <div className="bg-info rounded-[10px] p-[18px] space-y-6">
        {/* Dados Básicos */}
        <div>
          <h4 className="text-secondary text-sm font-bold font-nunito mb-4">
            Dados Básicos
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary-text mb-2">
                CNPJ
              </label>
              <input
                type="text"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                disabled={!isEditing}
                className="w-full h-12 px-4 rounded-lg border border-secondary bg-primary-bg text-primary-text focus:outline-none focus:border-primary disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-text mb-2">
                Razão Social
              </label>
              <input
                type="text"
                value={razaoSocial}
                onChange={(e) => setRazaoSocial(e.target.value)}
                disabled={!isEditing}
                className="w-full h-12 px-4 rounded-lg border border-secondary bg-primary-bg text-primary-text focus:outline-none focus:border-primary disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-text mb-2">
                Nome Fantasia
              </label>
              <input
                type="text"
                value={nomeFantasia}
                onChange={(e) => setNomeFantasia(e.target.value)}
                disabled={!isEditing}
                className="w-full h-12 px-4 rounded-lg border border-secondary bg-primary-bg text-primary-text focus:outline-none focus:border-primary disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-text mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!isEditing}
                className="w-full h-12 px-4 rounded-lg border border-secondary bg-primary-bg text-primary-text focus:outline-none focus:border-primary disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-text mb-2">
                Telefone
              </label>
              <input
                type="text"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                disabled={!isEditing}
                className="w-full h-12 px-4 rounded-lg border border-secondary bg-primary-bg text-primary-text focus:outline-none focus:border-primary disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* Dados Fiscais */}
        <div>
          <h4 className="text-secondary text-sm font-bold font-nunito mb-4">
            Dados Fiscais
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary-text mb-2">
                Regime Tributário
              </label>
              <input
                type="text"
                value={regimeTributario}
                onChange={(e) => setRegimeTributario(e.target.value)}
                disabled={!isEditing}
                className="w-full h-12 px-4 rounded-lg border border-secondary bg-primary-bg text-primary-text focus:outline-none focus:border-primary disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-text mb-2">
                Inscrição Estadual
              </label>
              <input
                type="text"
                value={inscricaoEstadual}
                onChange={(e) => setInscricaoEstadual(e.target.value)}
                disabled={!isEditing}
                className="w-full h-12 px-4 rounded-lg border border-secondary bg-primary-bg text-primary-text focus:outline-none focus:border-primary disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-text mb-2">
                Inscrição Municipal
              </label>
              <input
                type="text"
                value={inscricaoMunicipal}
                onChange={(e) => setInscricaoMunicipal(e.target.value)}
                disabled={!isEditing}
                className="w-full h-12 px-4 rounded-lg border border-secondary bg-primary-bg text-primary-text focus:outline-none focus:border-primary disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* Endereço */}
        <div>
          <h4 className="text-secondary text-sm font-bold font-nunito mb-4">
            Endereço
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary-text mb-2">
                CEP
              </label>
              <input
                type="text"
                value={cep}
                onChange={(e) => setCep(e.target.value)}
                disabled={!isEditing}
                className="w-full h-12 px-4 rounded-lg border border-secondary bg-primary-bg text-primary-text focus:outline-none focus:border-primary disabled:opacity-50"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-primary-text mb-2">
                Rua
              </label>
              <input
                type="text"
                value={rua}
                onChange={(e) => setRua(e.target.value)}
                disabled={!isEditing}
                className="w-full h-12 px-4 rounded-lg border border-secondary bg-primary-bg text-primary-text focus:outline-none focus:border-primary disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-text mb-2">
                Número
              </label>
              <input
                type="text"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                disabled={!isEditing}
                className="w-full h-12 px-4 rounded-lg border border-secondary bg-primary-bg text-primary-text focus:outline-none focus:border-primary disabled:opacity-50"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-primary-text mb-2">
                Complemento
              </label>
              <input
                type="text"
                value={complemento}
                onChange={(e) => setComplemento(e.target.value)}
                disabled={!isEditing}
                className="w-full h-12 px-4 rounded-lg border border-secondary bg-primary-bg text-primary-text focus:outline-none focus:border-primary disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-text mb-2">
                Bairro
              </label>
              <input
                type="text"
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
                disabled={!isEditing}
                className="w-full h-12 px-4 rounded-lg border border-secondary bg-primary-bg text-primary-text focus:outline-none focus:border-primary disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-text mb-2">
                Cidade
              </label>
              <input
                type="text"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                disabled={!isEditing}
                className="w-full h-12 px-4 rounded-lg border border-secondary bg-primary-bg text-primary-text focus:outline-none focus:border-primary disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-text mb-2">
                Estado
              </label>
              <input
                type="text"
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                disabled={!isEditing}
                className="w-full h-12 px-4 rounded-lg border border-secondary bg-primary-bg text-primary-text focus:outline-none focus:border-primary disabled:opacity-50"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

