'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { Cliente } from '@/src/domain/entities/Cliente'
import { showToast } from '@/src/shared/utils/toast'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { CidadeAutocomplete } from '@/src/presentation/components/ui/cidade-autocomplete'

// Siglas dos estados brasileiros em ordem alfabética
const ESTADOS_BRASILEIROS = [
  { sigla: 'AC', nome: 'Acre' },
  { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'BA', nome: 'Bahia' },
  { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' },
  { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MT', nome: 'Mato Grosso' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'PE', nome: 'Pernambuco' },
  { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' },
  { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'TO', nome: 'Tocantins' },
]

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
  const [cidadeValida, setCidadeValida] = useState<boolean | null>(null)
  const [codigoCidadeIbge, setCodigoCidadeIbge] = useState<string | null>(null)
  
  // Ref para rastrear o último valor de cidade usado para buscar código IBGE
  const ultimaCidadeBuscada = useRef<string>('')

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
            
            // Carregar código IBGE se cidade e estado estiverem preenchidos
            if (endereco.cidade && endereco.estado) {
              const cidade = endereco.cidade
              ultimaCidadeBuscada.current = cidade
              buscarCodigoIbge(cidade, endereco.estado)
            } else {
              setCodigoCidadeIbge(null)
              ultimaCidadeBuscada.current = ''
            }
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

  // Função para buscar código IBGE da cidade
  // Retorna true se encontrou a cidade e código IBGE, false caso contrário
  const buscarCodigoIbge = async (nomeCidade: string, uf: string): Promise<boolean> => {
    if (!nomeCidade || !uf) {
      setCodigoCidadeIbge(null)
      ultimaCidadeBuscada.current = ''
      return false
    }

    // Evitar buscar novamente se já foi buscado para este valor
    if (ultimaCidadeBuscada.current === nomeCidade && codigoCidadeIbge) {
      return true
    }

    // Marcar que está buscando este valor
    ultimaCidadeBuscada.current = nomeCidade

    try {
      // Buscar lista de municípios do estado
      const response = await fetch(`/api/v1/ibge/municipios?uf=${uf}`)
      if (response.ok) {
        const data = await response.json()
        const municipios = data.municipios || []
        
        // Normalizar nome da cidade para comparação (remover acentos, converter para minúsculas)
        const normalizar = (str: string) => 
          str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
        
        const cidadeNormalizada = normalizar(nomeCidade.trim())
        
        // Buscar município correspondente
        const municipio = municipios.find((m: any) => 
          normalizar(m.nomeCidade) === cidadeNormalizada
        )
        
        if (municipio && municipio.codigoCidadeIbge) {
          setCodigoCidadeIbge(municipio.codigoCidadeIbge)
          return true
        } else {
          // Se não encontrou na lista, tentar via API de validação
          const validacaoResponse = await fetch(
            `/api/v1/ibge/validar-cidade?cidade=${encodeURIComponent(nomeCidade.trim())}&uf=${uf}`
          )
          if (validacaoResponse.ok) {
            const validacaoData = await validacaoResponse.json()
            if (validacaoData.codigoCidadeIbge) {
              setCodigoCidadeIbge(validacaoData.codigoCidadeIbge)
              return true
            } else {
              setCodigoCidadeIbge(null)
              return false
            }
          } else {
            setCodigoCidadeIbge(null)
            return false
          }
        }
      } else {
        setCodigoCidadeIbge(null)
        return false
      }
    } catch (error) {
      console.error('Erro ao buscar código IBGE:', error)
      setCodigoCidadeIbge(null)
      return false
    }
  }

  const handleSave = async () => {
    const token = auth?.getAccessToken()
    if (!token || !empresa) {
      console.error('Token ou empresa não disponível')
      return
    }

    // Validar cidade antes de salvar
    if (cidade && estado) {
      // Se já temos código IBGE, significa que uma cidade foi selecionada da lista
      // e podemos confiar que o nome está correto
      if (codigoCidadeIbge) {
        // Cidade já foi selecionada da lista e código IBGE está disponível
        // Não precisa validar novamente, apenas garantir que o nome está correto
        if (ultimaCidadeBuscada.current && ultimaCidadeBuscada.current !== cidade.trim()) {
          // Se o nome no formulário não corresponde ao nome oficial selecionado,
          // atualizar com o nome oficial
          setCidade(ultimaCidadeBuscada.current)
        }
      } else {
        // Se não tem código IBGE, validar via API
        // Usar o nome da cidade do formulário, mas se tivermos ultimaCidadeBuscada, usar ela
        const nomeCidadeParaValidar = ultimaCidadeBuscada.current || cidade.trim()
        
        try {
          const response = await fetch(
            `/api/v1/ibge/validar-cidade?cidade=${encodeURIComponent(nomeCidadeParaValidar)}&uf=${estado}`
          )
          if (response.ok) {
            const data = await response.json()
            if (!data.valido) {
              showToast.error(`Cidade "${nomeCidadeParaValidar}" não encontrada no estado ${estado}. Por favor, selecione uma cidade válida.`)
              return
            }
            // Buscar código IBGE se não estiver definido
            if (!codigoCidadeIbge) {
              await buscarCodigoIbge(nomeCidadeParaValidar, estado)
            }
            // Atualizar formulário com o nome oficial se diferente
            if (nomeCidadeParaValidar !== cidade.trim()) {
              setCidade(nomeCidadeParaValidar)
            }
          }
        } catch (error) {
          console.error('Erro ao validar cidade:', error)
          // Continuar mesmo se a validação falhar (pode ser problema de rede)
          // Tentar buscar código IBGE mesmo assim
          if (!codigoCidadeIbge) {
            await buscarCodigoIbge(nomeCidadeParaValidar, estado)
          }
        }
      }
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
      // Usar o nome oficial da cidade se disponível, senão usar o valor do formulário
      const nomeCidadeParaSalvar = ultimaCidadeBuscada.current || cidade
      if (nomeCidadeParaSalvar) endereco.cidade = nomeCidadeParaSalvar
      if (estado) endereco.estado = estado
      if (codigoCidadeIbge) endereco.codigoCidadeIbge = codigoCidadeIbge

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
        <JiffyLoading />
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
              disabled={cidadeValida === false && cidade.length > 0}
              className="h-8 px-6 bg-primary text-white rounded-lg text-sm font-medium font-exo hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
          <h4 className="text-primary text-lg font-semibold font-nunito mb-2">
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
          <h4 className="text-primary text-lg font-semibold font-nunito mb-2">
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
              <CidadeAutocomplete
                value={cidade}
                onChange={(novaCidade) => {
                  // Atualizar estado quando cidade é alterada (digitada ou selecionada)
                  setCidade(novaCidade)
                  // Se a cidade foi apenas digitada (não selecionada da lista),
                  // limpar código IBGE para forçar busca quando for validada/selecionada
                  if (!novaCidade) {
                    setCodigoCidadeIbge(null)
                    ultimaCidadeBuscada.current = ''
                  }
                }}
                estado={estado}
                label="Cidade"
                placeholder="Digite o nome da cidade"
                required={false}
                disabled={!isEditing || !estado}
                useNativeInput={true}
                inputClassName="w-full h-8 px-4 rounded-lg border border-primary bg-primary-bg text-primary-text focus:outline-none focus:border-primary disabled:opacity-50"
                onCidadeSelecionada={(nomeCidade, codigoIbge) => {
                  // Quando uma cidade é selecionada da lista, armazenar código IBGE imediatamente
                  // e garantir que o estado do formulário seja atualizado com o nome oficial
                  setCodigoCidadeIbge(codigoIbge)
                  ultimaCidadeBuscada.current = nomeCidade
                  setCidadeValida(true)
                  // Atualizar o estado do formulário com o nome oficial da cidade selecionada
                  // Isso garante que a variável cidade tenha o valor correto
                  setCidade(nomeCidade)
                }}
                onValidationChange={async (isValid) => {
                  setCidadeValida(isValid)
                  // Se validou como true e não tem código IBGE ainda, buscar
                  // Isso cobre o caso de validação via API (quando usuário digita e perde foco)
                  if (isValid && cidade && estado && !codigoCidadeIbge) {
                    await buscarCodigoIbge(cidade.trim(), estado)
                  }
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-text">
                Estado
              </label>
              <select
                value={estado}
                onChange={async (e) => {
                  const novoEstado = e.target.value
                  const cidadeAnterior = cidade
                  
                  // Limpa código IBGE ao trocar o estado
                  setCodigoCidadeIbge(null)
                  ultimaCidadeBuscada.current = ''
                  setCidadeValida(null)
                  
                  // Se havia uma cidade preenchida antes, tentar buscar código IBGE para o novo estado
                  // Se encontrar, manter a cidade; se não encontrar, limpar
                  if (cidadeAnterior && cidadeAnterior.trim() && novoEstado) {
                    // Aguardar um pouco para garantir que o estado foi atualizado
                    await new Promise(resolve => setTimeout(resolve, 100))
                    // Tentar buscar código IBGE da cidade no novo estado
                    const encontrou = await buscarCodigoIbge(cidadeAnterior.trim(), novoEstado)
                    if (encontrou) {
                      // Cidade existe no novo estado, manter ela
                      setEstado(novoEstado)
                      setCidadeValida(true)
                    } else {
                      // Cidade não existe no novo estado, limpar
                      setEstado(novoEstado)
                      setCidade('')
                    }
                  } else {
                    // Não havia cidade, apenas atualizar estado
                    setEstado(novoEstado)
                    setCidade('')
                  }
                }}
                disabled={!isEditing}
                className="w-full h-8 px-4 rounded-lg border border-primary bg-primary-bg text-primary-text focus:outline-none focus:border-primary disabled:opacity-50"
              >
                <option value="">Selecione o estado</option>
                {ESTADOS_BRASILEIROS.map((estadoOption) => (
                  <option key={estadoOption.sigla} value={estadoOption.sigla}>
                    {estadoOption.sigla} - {estadoOption.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}

