'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { Cliente } from '@/src/domain/entities/Cliente'
import { showToast } from '@/src/shared/utils/toast'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { CidadeAutocomplete } from '@/src/presentation/components/ui/cidade-autocomplete'
import { Input } from '@/src/presentation/components/ui/input'
import { MenuItem } from '@mui/material'

/** Labels outlined — alinhado a NovoMeioPagamento / EditarTerminais */
const sxOutlinedLabelTextoEscuro = {
  '& .MuiInputLabel-root': {
    color: 'var(--color-primary-text)',
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: 'var(--color-primary-text)',
  },
  '& .MuiInputLabel-root.MuiInputLabel-shrink': {
    color: 'var(--color-primary-text)',
  },
} as const

const entradaCompactaInput = {
  padding: '12px 10px',
  fontSize: '0.875rem',
} as const

const entradaCompactaSelect = {
  padding: '12px 10px',
  fontSize: '0.875rem',
  minHeight: '1.5em',
  lineHeight: 1.4,
  display: 'flex',
  alignItems: 'center',
} as const

const sxEntradaEmpresa = {
  ...sxOutlinedLabelTextoEscuro,
  '& .MuiOutlinedInput-root': {
    backgroundColor: 'transparent',
    borderRadius: '8px',
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(0, 0, 0, 0.23)',
  },
  '& .MuiOutlinedInput-input': entradaCompactaInput,
  '& .MuiOutlinedInput-input.Mui-disabled': {
    WebkitTextFillColor: 'var(--color-primary-text)',
    opacity: 0.85,
  },
  '& .MuiSelect-select': entradaCompactaSelect,
} as const

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

/** Fusos IANA usados no Brasil (campo `parametroEmpresa.timezone` na API). */
const FUSOS_IANA_BRASIL = [
  { id: 'America/Noronha', label: 'America/Noronha (Fernando de Noronha)' },
  { id: 'America/Sao_Paulo', label: 'America/Sao_Paulo — Brasília (maior parte do país)' },
  { id: 'America/Araguaina', label: 'America/Araguaina' },
  { id: 'America/Fortaleza', label: 'America/Fortaleza' },
  { id: 'America/Recife', label: 'America/Recife' },
  { id: 'America/Maceio', label: 'America/Maceió' },
  { id: 'America/Bahia', label: 'America/Bahia' },
  { id: 'America/Belem', label: 'America/Belém' },
  { id: 'America/Cuiaba', label: 'America/Cuiabá (MT)' },
  { id: 'America/Campo_Grande', label: 'America/Campo Grande (MS)' },
  { id: 'America/Manaus', label: 'America/Manaus (AM)' },
  { id: 'America/Porto_Velho', label: 'America/Porto Velho (RO)' },
  { id: 'America/Boa_Vista', label: 'America/Boa Vista (RR)' },
  { id: 'America/Rio_Branco', label: 'America/Rio Branco (AC)' },
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
  /** Valor exibido no select (IANA); vem de `parametroEmpresa.timezone` no GET /empresas/me. */
  const [timezone, setTimezone] = useState('')
  /** Snapshot de `parametroEmpresa` para PATCH preservar tipos impressão/cobrança etc. */
  const [parametroEmpresaDraft, setParametroEmpresaDraft] = useState<Record<string, unknown>>({})

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

        const raw = data as Record<string, unknown>
        const rawPe = raw.parametroEmpresa
        if (rawPe && typeof rawPe === 'object' && !Array.isArray(rawPe)) {
          setParametroEmpresaDraft({ ...(rawPe as Record<string, unknown>) })
          const pe = rawPe as Record<string, unknown>
          const tz =
            (typeof pe.timezone === 'string' && pe.timezone) ||
            (typeof pe.timeZone === 'string' && pe.timeZone) ||
            ''
          setTimezone(String(tz).trim())
        } else {
          setParametroEmpresaDraft({})
          setTimezone('')
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
        console.error(
          'Erro na resposta da API:',
          response.status,
          await response.text().catch(() => '')
        )
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
          str
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()

        const cidadeNormalizada = normalizar(nomeCidade.trim())

        // Buscar município correspondente
        const municipio = municipios.find(
          (m: any) => normalizar(m.nomeCidade) === cidadeNormalizada
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
              showToast.error(
                `Cidade "${nomeCidadeParaValidar}" não encontrada no estado ${estado}. Por favor, selecione uma cidade válida.`
              )
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

      /* PATCH: `parametroEmpresa.timezone` — preserva outros campos já retornados pela API. */
      const parametroEmpresa: Record<string, unknown> = { ...parametroEmpresaDraft }
      if (timezone.trim()) {
        parametroEmpresa.timezone = timezone.trim()
      } else {
        delete parametroEmpresa.timezone
      }
      if (Object.keys(parametroEmpresa).length > 0) {
        body.parametroEmpresa = parametroEmpresa
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
    <div className="scrollbar-hide h-full overflow-y-auto px-1 py-1 md:px-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between border-b-2 border-primary/70 pb-2">
          <div>
            <h3 className="text-lg font-semibold text-primary md:text-xl">Dados da Empresa</h3>
            <p className="text-xs text-secondary-text md:text-sm">
              Gerencie as informações da sua empresa
            </p>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="h-8 rounded-lg bg-primary px-6 font-exo text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              Editar
            </button>
          )}
          {isEditing && (
            <div className="flex flex-col gap-2 md:flex-row">
              <button
                onClick={handleSave}
                disabled={cidadeValida === false && cidade.length > 0}
                className="flex h-8 items-center gap-2 rounded-lg bg-primary px-6 font-exo text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span>✓</span> Salvar
              </button>
              <button
                onClick={() => {
                  setIsEditing(false)
                  loadEmpresa()
                }}
                className="h-8 rounded-lg border border-primary bg-primary/10 px-6 font-exo text-sm font-medium text-primary transition-colors hover:bg-primary/15"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4 bg-info px-1 md:px-[18px]">
          {/* Dados Básicos */}
          <div>
            <h4 className="font-nunito mb-2 text-lg font-semibold text-primary">Dados Básicos</h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="CNPJ"
                value={cnpj}
                onChange={e => setCnpj(e.target.value)}
                disabled={!isEditing}
                size="small"
                sx={sxEntradaEmpresa}
              />
              <Input
                label="Razão Social"
                value={razaoSocial}
                onChange={e => setRazaoSocial(e.target.value)}
                disabled={!isEditing}
                size="small"
                sx={sxEntradaEmpresa}
              />
              <Input
                label="Nome Fantasia"
                value={nomeFantasia}
                onChange={e => setNomeFantasia(e.target.value)}
                disabled={!isEditing}
                size="small"
                sx={sxEntradaEmpresa}
              />
              <Input
                type="email"
                label="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={!isEditing}
                size="small"
                sx={sxEntradaEmpresa}
              />
              <Input
                label="Telefone"
                value={telefone}
                onChange={e => setTelefone(e.target.value)}
                disabled={!isEditing}
                size="small"
                sx={sxEntradaEmpresa}
              />
            </div>
          </div>

          {/* Endereço */}
          <div>
            <h4 className="font-nunito mb-2 text-lg font-semibold text-primary">Endereço</h4>
            <div className="space-y-4">
              {/* Linha 1: CEP + Rua */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Input
                  label="CEP"
                  value={cep}
                  onChange={e => setCep(e.target.value)}
                  disabled={!isEditing}
                  size="small"
                  sx={sxEntradaEmpresa}
                />
                <div className="md:col-span-2">
                  <Input
                    label="Rua"
                    value={rua}
                    onChange={e => setRua(e.target.value)}
                    disabled={!isEditing}
                    size="small"
                    sx={sxEntradaEmpresa}
                  />
                </div>
              </div>

              {/* Linha 2: Número, Complemento e Bairro */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Input
                  label="Número"
                  value={numero}
                  onChange={e => setNumero(e.target.value)}
                  disabled={!isEditing}
                  size="small"
                  sx={sxEntradaEmpresa}
                />
                <Input
                  label="Complemento"
                  value={complemento}
                  onChange={e => setComplemento(e.target.value)}
                  disabled={!isEditing}
                  size="small"
                  sx={sxEntradaEmpresa}
                />
                <Input
                  label="Bairro"
                  value={bairro}
                  onChange={e => setBairro(e.target.value)}
                  disabled={!isEditing}
                  size="small"
                  sx={sxEntradaEmpresa}
                />
              </div>

              {/* Linha 3: Estado + Cidade + Fuso horário (IANA) */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Input
                  select
                  label="Estado"
                  value={estado}
                  onChange={async e => {
                    const novoEstado = e.target.value
                    const cidadeAnterior = cidade

                    setCodigoCidadeIbge(null)
                    ultimaCidadeBuscada.current = ''
                    setCidadeValida(null)

                    if (cidadeAnterior && cidadeAnterior.trim() && novoEstado) {
                      await new Promise(resolve => setTimeout(resolve, 100))
                      const encontrou = await buscarCodigoIbge(cidadeAnterior.trim(), novoEstado)
                      if (encontrou) {
                        setEstado(novoEstado)
                        setCidadeValida(true)
                      } else {
                        setEstado(novoEstado)
                        setCidade('')
                      }
                    } else {
                      setEstado(novoEstado)
                      setCidade('')
                    }
                  }}
                  disabled={!isEditing}
                  size="small"
                  sx={sxEntradaEmpresa}
                  InputLabelProps={{ shrink: true }}
                  SelectProps={{ displayEmpty: true }}
                >
                  <MenuItem value="">
                    <em>Selecione o estado</em>
                  </MenuItem>
                  {ESTADOS_BRASILEIROS.map(estadoOption => (
                    <MenuItem key={estadoOption.sigla} value={estadoOption.sigla}>
                      {estadoOption.sigla} - {estadoOption.nome}
                    </MenuItem>
                  ))}
                </Input>
                <CidadeAutocomplete
                  value={cidade}
                  onChange={novaCidade => {
                    setCidade(novaCidade)
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
                  useNativeInput={false}
                  sx={sxEntradaEmpresa}
                  onCidadeSelecionada={(nomeCidade, codigoIbge) => {
                    setCodigoCidadeIbge(codigoIbge)
                    ultimaCidadeBuscada.current = nomeCidade
                    setCidadeValida(true)
                    setCidade(nomeCidade)
                  }}
                  onValidationChange={async isValid => {
                    setCidadeValida(isValid)
                    if (isValid && cidade && estado && !codigoCidadeIbge) {
                      await buscarCodigoIbge(cidade.trim(), estado)
                    }
                  }}
                />
                <Input
                  select
                  label="Fuso horário (IANA)"
                  value={timezone}
                  onChange={e => setTimezone(e.target.value)}
                  disabled={!isEditing}
                  size="small"
                  sx={sxEntradaEmpresa}
                  InputLabelProps={{ shrink: true }}
                  SelectProps={{ displayEmpty: true }}
                >
                  <MenuItem value="">
                    <em>Selecione o fuso</em>
                  </MenuItem>
                  {timezone && !FUSOS_IANA_BRASIL.some(f => f.id === timezone) && (
                    <MenuItem value={timezone}>{timezone} (registrado na API)</MenuItem>
                  )}
                  {FUSOS_IANA_BRASIL.map(f => (
                    <MenuItem key={f.id} value={f.id}>
                      {f.label}
                    </MenuItem>
                  ))}
                </Input>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
