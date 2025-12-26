'use client'

import { useState } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast } from '@/src/shared/utils/toast'
import * as XLSX from 'xlsx'
import {
  MdUpload,
  MdDescription,
  MdDownload,
  MdCheckCircle,
  MdError,
  MdArrowForward,
  MdArrowBack,
  MdExpandMore,
  MdExpandLess,
  MdClose,
} from 'react-icons/md'

/**
 * Tipo para resposta da API de importação
 */
type ImportacaoResponse = {
  totalErrorCount: number
  worksheetResults: Array<{
    worksheet: string
    successCount: number
    errorCount: number
    results: Array<{
      id: string
      status: string
      rowIndex: number
      errorMessages: string[]
      data?: Record<string, any> // Dados completos do registro quando disponível
    }>
  }>
}

/**
 * Processa a resposta da API e transforma no formato esperado pelo componente
 */
function processarResultadoAPI(
  data: ImportacaoResponse,
  sucesso: boolean
): {
  sucesso: boolean
  mensagens: string[]
  erros: Array<{ linha: number; campo: string; mensagem: string }>
  dadosCadastrados?: any[]
  totalErrorCount?: number
  worksheetResults?: ImportacaoResponse['worksheetResults']
} {
  const mensagens: string[] = []
  const erros: Array<{ linha: number; campo: string; mensagem: string }> = []

  // Processar resultados por worksheet
  data.worksheetResults?.forEach((worksheet) => {
    if (worksheet.successCount > 0) {
      mensagens.push(
        `Worksheet "${worksheet.worksheet}": ${worksheet.successCount} registro(s) cadastrado(s) com sucesso.`
      )
    }

    // Processar erros
    worksheet.results?.forEach((result) => {
      if (result.status === 'error' && result.errorMessages.length > 0) {
        result.errorMessages.forEach((errorMsg) => {
          erros.push({
            linha: result.rowIndex + 1, // +1 porque rowIndex começa em 0
            campo: result.id || 'N/A',
            mensagem: errorMsg,
          })
        })
      }
    })
  })

  // Mensagem geral
  if (data.totalErrorCount === 0 && sucesso) {
    const totalSuccess = data.worksheetResults?.reduce(
      (acc, ws) => acc + ws.successCount,
      0
    ) || 0
    mensagens.unshift(`Importação concluída com sucesso! ${totalSuccess} registro(s) cadastrado(s).`)
  } else if (data.totalErrorCount > 0) {
    mensagens.unshift(
      `Importação processada com ${data.totalErrorCount} erro(s). Nenhum dado foi cadastrado.`
    )
  }

  return {
    sucesso: sucesso && data.totalErrorCount === 0,
    mensagens,
    erros,
    totalErrorCount: data.totalErrorCount,
    worksheetResults: data.worksheetResults,
  }
}

/**
 * Componente de cadastro em massa por planilha
 * Permite cadastrar produtos, usuários, impressoras, meios de pagamento, etc.
 */
export function CadastroPorPlanilha() {
  // Estado do step atual (0 = Download, 1 = Upload, 2 = Resultado, 3 = Finalização)
  const [selectedStep, setSelectedStep] = useState(0)

  // Estados do componente
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [resultadoAnalise, setResultadoAnalise] = useState<{
    sucesso: boolean
    mensagens: string[]
    erros: Array<{ linha: number; campo: string; mensagem: string }>
    dadosCadastrados?: any[]
    totalErrorCount?: number
    worksheetResults?: Array<{
      worksheet: string
      successCount: number
      errorCount: number
      results: Array<{
        id: string
        status: string
        rowIndex: number
        errorMessages: string[]
      }>
    }>
  } | null>(null)

  const { auth } = useAuthStore()

  // Função para download da planilha modelo
  const handleDownloadModelo = async () => {
    try {
      const token = auth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado')
        return
      }

      const toastId = showToast.loading('Baixando planilha modelo...')

      const response = await fetch('/api/importacao/modelo', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        showToast.errorLoading(
          toastId,
          errorData.error || 'Erro ao baixar planilha modelo'
        )
        return
      }

      // Obter o arquivo como blob
      const blob = await response.blob()

      // Criar URL temporária para download
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'modelo_importacao.xlsx'
      document.body.appendChild(link)
      link.click()

      // Limpar
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      showToast.successLoading(toastId, 'Planilha modelo baixada com sucesso!')
    } catch (error) {
      console.error('Erro ao baixar planilha modelo:', error)
      showToast.error('Erro ao baixar planilha modelo')
    }
  }

  // Função para download da planilha de descrição
  const handleDownloadDescricao = async () => {
    try {
      const token = auth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado')
        return
      }

      const toastId = showToast.loading('Baixando planilha de descrição...')

      const response = await fetch('/api/importacao/descricao', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        showToast.errorLoading(
          toastId,
          errorData.error || 'Erro ao baixar planilha de descrição'
        )
        return
      }

      // Obter o arquivo como blob
      const blob = await response.blob()

      // Criar URL temporária para download
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'descricao_importacao.xlsx'
      document.body.appendChild(link)
      link.click()

      // Limpar
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      showToast.successLoading(toastId, 'Planilha de descrição baixada com sucesso!')
    } catch (error) {
      console.error('Erro ao baixar planilha de descrição:', error)
      showToast.error('Erro ao baixar planilha de descrição')
    }
  }

  // Função para fazer upload do arquivo
  const handleUpload = async () => {
    if (!arquivo) {
      showToast.error('Selecione um arquivo para upload')
      return
    }

    const toastId = showToast.loading('Enviando arquivo...')
    setIsUploading(true)

    try {
      const token = auth?.getAccessToken()
      if (!token) {
        showToast.errorLoading(toastId, 'Token não encontrado')
        return
      }

      const formData = new FormData()
      formData.append('file', arquivo)

      const response = await fetch('/api/importacao/xlsx', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      const responseData = await response.json()

      if (!response.ok) {
        // Erro 400 ou outro erro
        const errorMessage = responseData.message || responseData.error || 'Erro ao processar planilha'
        
        // Processar erros e sempre passar para Step 3 para exibir detalhes
        let processedResult
        
        if (responseData.results) {
          // Se tiver resultados estruturados, processar normalmente
          processedResult = processarResultadoAPI(responseData.results, false)
        } else {
          // Se não tiver resultados, criar estrutura com erros do campo 'errors'
          const erros: Array<{ linha: number; campo: string; mensagem: string }> = []
          
          // Processar erros do campo 'errors' (array de strings)
          if (responseData.errors && Array.isArray(responseData.errors)) {
            responseData.errors.forEach((errorMsg: string) => {
              // Tentar extrair linha e tabela da mensagem de erro
              // Exemplo: "Os codigosGruposComplementos utilizados nas linhas 2 da tabela de Produtos..."
              const linhaMatch = errorMsg.match(/linhas?\s+(\d+)/i)
              const linha = linhaMatch ? parseInt(linhaMatch[1], 10) : 0
              
              // Tentar extrair nome da tabela
              const tabelaMatch = errorMsg.match(/tabela\s+de\s+([^\.\s]+)/i)
              const tabela = tabelaMatch ? tabelaMatch[1] : 'Planilha'
              
              // Tentar extrair nome do campo
              const campoMatch = errorMsg.match(/^([^utilizados]+?)\s+utilizados/i) || 
                                errorMsg.match(/campo\s+['"]?([^'"]+)['"]?/i)
              const campo = campoMatch ? campoMatch[1].trim() : 'Campo não especificado'
              
              erros.push({
                linha,
                campo: `${tabela} - ${campo}`,
                mensagem: errorMsg,
              })
            })
          } else {
            // Se não tiver array de erros, criar um erro genérico
            erros.push({
              linha: 0,
              campo: 'Planilha',
              mensagem: errorMessage,
            })
          }
          
          processedResult = {
            sucesso: false,
            mensagens: [errorMessage],
            erros,
            totalErrorCount: erros.length,
            worksheetResults: [],
          }
        }
        
        setResultadoAnalise(processedResult)
        setIsUploading(false)
        showToast.errorLoading(toastId, errorMessage)
        setSelectedStep(2) // Vai para o step de resultado para exibir erros detalhados
        return
      }

      // Sucesso (200)
      const processedResult = processarResultadoAPI(responseData, true)
      setResultadoAnalise(processedResult)
      setIsUploading(false)
      showToast.successLoading(toastId, 'Arquivo processado com sucesso!')
      setSelectedStep(2) // Vai para o step de resultado
    } catch (error) {
      console.error('Erro ao fazer upload:', error)
      setIsUploading(false)
      showToast.errorLoading(toastId, 'Erro ao fazer upload do arquivo')
    }
  }

  // Função para avançar para o próximo step
  const handleNext = () => {
    if (selectedStep < 3) {
      setSelectedStep(selectedStep + 1)
    }
  }

  // Função para voltar ao step anterior
  const handleBack = () => {
    if (selectedStep > 0) {
      setSelectedStep(selectedStep - 1)
    }
  }

  // Função para finalizar
  const handleFinalizar = () => {
    // Resetar estados
    setArquivo(null)
    setResultadoAnalise(null)
    setSelectedStep(0)
    showToast.success('Processo finalizado com sucesso!')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header fixo com título */}
      <div className="sticky top-0 z-10 bg-primary-bg/90 backdrop-blur-sm rounded-tl-lg shadow-md">
        <div className="px-[30px] py-[4px]">
          <div className="rounded-lg border border-[#E0E4F3] bg-gradient-to-br from-[#F6F7FF] to-[#EEF1FB] px-6 py-3 shadow-[0_15px_45px_rgba(15,23,42,0.08)]">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-lg bg-white flex items-center justify-center shadow-inner text-primary">
                <MdUpload className="text-2xl" />
              </div>
              <div>
                <p className="text-sm font-semibold text-primary font-exo uppercase tracking-wide">
                  Cadastro em Massa
                </p>
                <h2 className="text-xl font-bold text-primary font-exo leading-tight">
                  Importar por Planilha
                </h2>
                <p className="text-sm text-secondary-text font-nunito">
                  {selectedStep === 0 && 'Baixe a planilha modelo e preencha os dados'}
                  {selectedStep === 1 && 'Faça upload da planilha preenchida'}
                  {selectedStep === 2 && 'Revise os resultados da importação'}
                  {selectedStep === 3 && 'Processo finalizado com sucesso'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Indicador de steps */}
      <div className="px-5 py-1">
        <div className="flex items-center justify-center gap-4">
          {[0, 1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-base font-bold font-exo transition-colors ${
                  selectedStep === step
                    ? 'bg-[#B7E246] text-primary'
                    : selectedStep > step
                    ? 'bg-[#B7E246] text-primary'
                    : 'bg-[#CEDCF8] text-primary'
                }`}
              >
                {step + 1}
              </div>
              {step < 3 && (
                <div
                  className={`h-[2px] w-28 transition-colors ${
                    selectedStep > step ? 'bg-[#B7E246]' : 'bg-[#CEDCF8]'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Conteúdo das etapas */}
      <div className="flex-1 overflow-y-auto px-5 pb-5">
        {selectedStep === 0 && (
          <Step1Download
            onDownloadModelo={handleDownloadModelo}
            onDownloadDescricao={handleDownloadDescricao}
            onNext={handleNext}
          />
        )}

        {selectedStep === 1 && (
          <Step2Upload
            arquivo={arquivo}
            onArquivoChange={setArquivo}
            isUploading={isUploading}
            onUpload={handleUpload}
            onBack={handleBack}
          />
        )}

        {selectedStep === 2 && (
          <Step3Resultado
            resultadoAnalise={resultadoAnalise}
            arquivo={arquivo}
            onBack={handleBack}
            onNext={handleNext}
          />
        )}

        {selectedStep === 3 && (
          <Step4Finalizacao
            resultadoAnalise={resultadoAnalise}
            onFinalizar={handleFinalizar}
          />
        )}
      </div>
    </div>
  )
}

/**
 * Step 1: Download das planilhas modelo
 */
function Step1Download({
  onDownloadModelo,
  onDownloadDescricao,
  onNext,
}: {
  onDownloadModelo: () => void
  onDownloadDescricao: () => void
  onNext: () => void
}) {
  return (
    <div className="rounded-[24px] border border-[#E5E7F2] bg-white p-4 shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
      {/* Título */}
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-primary text-xl font-semibold font-exo">
            Download da Planilha Modelo
          </h3>
          <div className="flex-1 h-[2px] bg-primary/50" />
        </div>
        <p className="text-sm text-secondary-text font-nunito">
          Baixe a planilha modelo e a planilha de descrição para entender o formato dos dados
        </p>
      </div>

      {/* Botões de download */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <button
          onClick={onDownloadModelo}
          className="flex items-center justify-center gap-3 h-14 px-6 rounded-lg bg-primary text-white font-semibold font-nunito text-sm shadow-[0_8px_20px_rgba(10,57,122,0.35)] transition-all hover:bg-primary/90"
        >
          <MdDownload size={20} />
          Download Planilha Modelo
        </button>
        <button
          onClick={onDownloadDescricao}
          className="flex items-center justify-center gap-3 h-14 px-6 rounded-lg border-2 border-primary bg-white text-primary font-semibold font-nunito text-sm transition-all hover:bg-primary/10"
        >
          <MdDownload size={20} />
          Download Planilha de Descrição
        </button>
      </div>

      {/* Área de texto explicativo */}
      <div className="rounded-lg border border-[#E6E9F4] bg-gradient-to-br from-[#F9FAFF] to-white p-6 mb-6">
        <h4 className="text-primary-text font-semibold font-exo text-base mb-3">
          Como funciona o sistema de importação
        </h4>
        <div className="space-y-2 text-sm text-secondary-text font-nunito">
          <p>
            <strong className="text-primary-text">1. Download:</strong> Baixe a planilha modelo e a
            planilha de descrição para entender o formato dos dados.
          </p>
          <p>
            <strong className="text-primary-text">2. Preenchimento:</strong> Preencha a planilha
            modelo com os dados que deseja cadastrar em massa.
          </p>
          <p>
            <strong className="text-primary-text">3. Upload:</strong> Faça upload da planilha
            preenchida no próximo passo.
          </p>
          <p>
            <strong className="text-primary-text">4. Análise:</strong> O sistema irá analisar os
            dados da planilha. Os dados só serão cadastrados no banco se não houver nenhum erro.
            Caso exista erro, será exibido um log e não será cadastrado nenhuma informação no banco.
          </p>
          <p>
            <strong className="text-primary-text">5. Finalização:</strong> Revise os resultados e
            finalize o processo.
          </p>
        </div>
      </div>

      {/* Botão Próximo */}
      <div className="flex justify-end pt-6 border-t border-dashed border-[#E4E7F4] mt-4">
        <button
          onClick={onNext}
          className="h-8 px-10 rounded-lg bg-primary text-white font-semibold font-exo text-sm hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          Próximo
          <MdArrowForward size={18} />
        </button>
      </div>
    </div>
  )
}

/**
 * Step 2: Upload do arquivo
 */
function Step2Upload({
  arquivo,
  onArquivoChange,
  isUploading,
  onUpload,
  onBack,
}: {
  arquivo: File | null
  onArquivoChange: (file: File | null) => void
  isUploading: boolean
  onUpload: () => void
  onBack: () => void
}) {
  return (
    <div className="rounded-[24px] border border-[#E5E7F2] bg-white p-4 shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
      {/* Título */}
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-primary text-xl font-semibold font-exo">Upload do Arquivo</h3>
          <div className="flex-1 h-[2px] bg-primary/50" />
        </div>
        <p className="text-sm text-secondary-text font-nunito">
          Faça upload da planilha preenchida com os dados para cadastro
        </p>
      </div>

      {/* Área de upload */}
      <div className="mb-6">
        <label className="block text-sm font-semibold font-nunito mb-2 text-primary-text">
          Arquivo XLSX
        </label>
        <div className="border-2 border-dashed border-[#CBD0E3] rounded-lg p-8 text-center hover:border-primary transition-colors">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                onArquivoChange(file)
              }
            }}
            className="hidden"
            id="file-upload"
            disabled={isUploading}
          />
          <label
            htmlFor="file-upload"
            className={`cursor-pointer flex flex-col items-center gap-3 ${
              isUploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <MdDescription className="text-4xl text-secondary-text" />
            <div>
              <p className="text-sm font-semibold text-primary-text font-nunito">
                {arquivo ? arquivo.name : 'Clique para selecionar ou arraste o arquivo'}
              </p>
              <p className="text-xs text-secondary-text font-nunito mt-1">
                Apenas arquivos .xlsx ou .xls
              </p>
            </div>
          </label>
        </div>
        {arquivo && (
          <div className="mt-3 flex items-center justify-between gap-2 text-sm text-primary-text bg-gray-50 rounded-lg p-3 border border-[#E6E9F4]">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="font-semibold whitespace-nowrap">Arquivo selecionado:</span>
              <span className="truncate">{arquivo.name}</span>
              <span className="text-secondary-text whitespace-nowrap">
                ({(arquivo.size / 1024).toFixed(2)} KB)
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                onArquivoChange(null)
                // Limpar o input file também
                const fileInput = document.getElementById('file-upload') as HTMLInputElement
                if (fileInput) {
                  fileInput.value = ''
                }
              }}
              disabled={isUploading}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Remover arquivo"
            >
              <MdClose size={20} />
            </button>
          </div>
        )}
      </div>

      {/* Botões de ação */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between pt-6 border-t border-dashed border-[#E4E7F4] mt-4">
        <button
          onClick={onBack}
          className="h-8 px-10 rounded-lg border-2 border-primary bg-white text-primary font-semibold font-exo text-sm hover:bg-primary/10 transition-colors flex items-center gap-2"
        >
          <MdArrowBack size={18} />
          Voltar
        </button>
        <button
          onClick={onUpload}
          disabled={!arquivo || isUploading}
          className="h-8 px-10 rounded-lg bg-primary text-white font-semibold font-exo text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isUploading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              Enviar Arquivo
              <MdArrowForward size={18} />
            </>
          )}
        </button>
      </div>
    </div>
  )
}

/**
 * Step 3: Resultado da análise
 */
function Step3Resultado({
  resultadoAnalise,
  arquivo,
  onBack,
  onNext,
}: {
  resultadoAnalise: {
    sucesso: boolean
    mensagens: string[]
    erros: Array<{ linha: number; campo: string; mensagem: string }>
    dadosCadastrados?: any[]
    totalErrorCount?: number
    worksheetResults?: Array<{
      worksheet: string
      successCount: number
      errorCount: number
      results: Array<{
        id: string
        status: string
        rowIndex: number
        errorMessages: string[]
        data?: Record<string, any>
      }>
    }>
  } | null
  arquivo: File | null
  onBack: () => void
  onNext: () => void
}) {
  // Estado para controlar quais tabelas estão expandidas
  const [expandedWorksheets, setExpandedWorksheets] = useState<Set<string>>(new Set())
  // Estado para armazenar os dados lidos do arquivo XLSX por worksheet
  const [worksheetData, setWorksheetData] = useState<Record<string, any[]>>({})
  // Estado para controlar quais worksheets estão sendo carregados
  const [loadingWorksheets, setLoadingWorksheets] = useState<Set<string>>(new Set())

  // Função para ler o arquivo XLSX e extrair dados de um worksheet específico
  const loadWorksheetData = async (worksheetName: string) => {
    if (!arquivo || worksheetData[worksheetName]) {
      return // Já carregado ou sem arquivo
    }

    setLoadingWorksheets((prev) => new Set(prev).add(worksheetName))

    try {
      // Ler o arquivo como ArrayBuffer
      const arrayBuffer = await arquivo.arrayBuffer()
      
      // Parse do arquivo XLSX
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      
      // Encontrar o worksheet pelo nome (case-insensitive)
      const sheetName = workbook.SheetNames.find(
        (name) => name.toLowerCase() === worksheetName.toLowerCase()
      )

      if (!sheetName) {
        console.warn(`Worksheet "${worksheetName}" não encontrado no arquivo`)
        setLoadingWorksheets((prev) => {
          const newSet = new Set(prev)
          newSet.delete(worksheetName)
          return newSet
        })
        return
      }

      // Converter o worksheet para JSON (primeira linha como cabeçalho)
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1, // Usar primeira linha como cabeçalho
        defval: '', // Valor padrão para células vazias
      })

      if (jsonData.length === 0) {
        setLoadingWorksheets((prev) => {
          const newSet = new Set(prev)
          newSet.delete(worksheetName)
          return newSet
        })
        return
      }

      // Primeira linha são os cabeçalhos
      const headers = (jsonData[0] || []) as string[]
      
      // Converter para array de objetos
      const data = jsonData.slice(1).map((row: unknown) => {
        const rowArray = (row || []) as any[]
        const rowData: Record<string, any> = {}
        headers.forEach((header, colIndex) => {
          rowData[header] = rowArray[colIndex] !== undefined ? rowArray[colIndex] : ''
        })
        return rowData
      })

      setWorksheetData((prev) => ({
        ...prev,
        [worksheetName]: data,
      }))
    } catch (error) {
      console.error(`Erro ao ler worksheet "${worksheetName}":`, error)
      showToast.error(`Erro ao carregar dados do worksheet "${worksheetName}"`)
    } finally {
      setLoadingWorksheets((prev) => {
        const newSet = new Set(prev)
        newSet.delete(worksheetName)
        return newSet
      })
    }
  }

  const toggleWorksheet = async (worksheetName: string) => {
    const isCurrentlyExpanded = expandedWorksheets.has(worksheetName)
    
    setExpandedWorksheets((prev) => {
      const newSet = new Set(prev)
      if (isCurrentlyExpanded) {
        newSet.delete(worksheetName)
      } else {
        newSet.add(worksheetName)
        // Carregar dados do arquivo XLSX quando expandir
        loadWorksheetData(worksheetName)
      }
      return newSet
    })
  }

  // Função para extrair registros com sucesso de um worksheet
  const getSuccessfulRecords = (worksheet: {
    results: Array<{
      id: string
      status: string
      rowIndex: number
      errorMessages: string[]
      data?: Record<string, any>
      [key: string]: any // Permitir outros campos
    }>
  }) => {
    // Filtrar registros com sucesso
    return worksheet.results.filter((result) => {
      const isNotError = result.status !== 'error' && result.errorMessages.length === 0
      const isSuccessStatus = result.status === 'success' || result.status === 'sucesso'
      
      // Verificar se tem dados no campo 'data' ou se o próprio resultado tem propriedades além dos campos padrão
      const hasDataField = result.data && Object.keys(result.data).length > 0
      
      // Se não tem campo 'data', tentar usar o próprio resultado (exceto campos padrão)
      const standardFields = ['id', 'status', 'rowIndex', 'errorMessages', 'data']
      const hasOtherFields = Object.keys(result).some(
        (key) => !standardFields.includes(key) && result[key] !== null && result[key] !== undefined
      )
      
      return (isNotError || isSuccessStatus) && (hasDataField || hasOtherFields)
    }).map((result) => {
      // Se não tem campo 'data', criar um objeto 'data' com os campos não-padrão
      if (!result.data || Object.keys(result.data).length === 0) {
        const standardFields = ['id', 'status', 'rowIndex', 'errorMessages', 'data']
        const dataFields: Record<string, any> = {}
        
        Object.keys(result).forEach((key) => {
          if (!standardFields.includes(key) && result[key] !== null && result[key] !== undefined) {
            dataFields[key] = result[key]
          }
        })
        
        // Se encontrou campos, criar o objeto data
        if (Object.keys(dataFields).length > 0) {
          return {
            ...result,
            data: dataFields,
          }
        }
      }
      
      return result
    })
  }

  // Função para obter as chaves (colunas) de um registro
  const getRecordKeys = (records: Array<{ data?: Record<string, any> }>) => {
    if (records.length === 0) return []
    const firstRecord = records[0]?.data
    if (!firstRecord) return []
    return Object.keys(firstRecord)
  }

  if (!resultadoAnalise) {
    return (
      <div className="rounded-[24px] border border-[#E5E7F2] bg-white p-4 shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
        <p className="text-center text-secondary-text py-8">
          Aguardando resultado da análise...
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-[24px] border border-[#E5E7F2] bg-white p-4 shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
      {/* Título */}
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-primary text-xl font-semibold font-exo">Resultado da Análise</h3>
          <div className="flex-1 h-[2px] bg-primary/50" />
        </div>
        <p className="text-sm text-secondary-text font-nunito">
          Revise os resultados da importação e os erros encontrados
        </p>
      </div>

      {/* Resumo por Worksheet com Tabelas Expansíveis */}
      {resultadoAnalise.worksheetResults && resultadoAnalise.worksheetResults.length > 0 && (
        <div className="mb-6 rounded-lg border border-[#E6E9F4] bg-gradient-to-br from-[#F9FAFF] to-white p-4">
          <h4 className="text-primary-text font-semibold font-exo text-base mb-3">
            Resumo por Worksheet
          </h4>
          <div className="space-y-3">
            {resultadoAnalise.worksheetResults.map((worksheet, index) => {
              const successfulRecords = getSuccessfulRecords(worksheet)
              const isExpanded = expandedWorksheets.has(worksheet.worksheet)
              // Se tem successCount > 0, permite expandir (mesmo que não tenha dados completos)
              const hasSuccessfulRecords = worksheet.successCount > 0

              return (
                <div
                  key={index}
                  className="bg-white rounded-lg border border-[#E6E9F4] overflow-hidden"
                >
                  {/* Header do Worksheet */}
                  <div
                    className={`p-3 ${hasSuccessfulRecords ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'} transition-colors`}
                    onClick={() => {
                      if (hasSuccessfulRecords) {
                        toggleWorksheet(worksheet.worksheet)
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {hasSuccessfulRecords && (
                          <div className="text-primary-text flex items-center justify-center">
                            {isExpanded ? (
                              <MdExpandLess className="text-xl" />
                            ) : (
                              <MdExpandMore className="text-xl" />
                            )}
                          </div>
                        )}
                        <span className="font-semibold text-primary-text font-exo text-sm">
                          {worksheet.worksheet}
                        </span>
                      </div>
                      <div className="flex gap-4 text-xs font-nunito">
                        {worksheet.successCount > 0 && (
                          <span className="text-green-600 font-semibold">
                            ✓ {worksheet.successCount} sucesso(s)
                          </span>
                        )}
                        {worksheet.errorCount > 0 && (
                          <span className="text-red-600 font-semibold">
                            ✗ {worksheet.errorCount} erro(s)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tabela de Dados Cadastrados (quando expandido) */}
                  {isExpanded && hasSuccessfulRecords && (
                    <div className="border-t border-[#E6E9F4] p-3 bg-gray-50">
                      {loadingWorksheets.has(worksheet.worksheet) ? (
                        <div className="text-center py-8">
                          <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
                          <p className="text-sm text-secondary-text font-nunito">
                            Carregando dados do arquivo...
                          </p>
                        </div>
                      ) : worksheetData[worksheet.worksheet] && worksheetData[worksheet.worksheet].length > 0 ? (
                        <>
                          <div className="overflow-x-auto max-h-96 overflow-y-auto scrollbar-hide">
                            <table className="w-full text-sm font-nunito border-collapse">
                              <thead className="sticky top-0 bg-white z-10">
                                <tr className="border-b-2 border-[#E6E9F4]">
                                  <th className="text-left py-2 px-3 font-semibold text-primary-text text-xs uppercase whitespace-nowrap">
                                    Linha
                                  </th>
                                  {Object.keys(worksheetData[worksheet.worksheet][0] || {}).map((key) => (
                                    <th
                                      key={key}
                                      className="text-left py-2 px-3 font-semibold text-primary-text text-xs uppercase whitespace-nowrap"
                                    >
                                      {key}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {worksheetData[worksheet.worksheet].map((row, rowIndex) => (
                                  <tr
                                    key={rowIndex}
                                    className="border-b border-[#E6E9F4] hover:bg-white transition-colors even:bg-gray-50/50"
                                  >
                                    <td className="py-2 px-3 text-secondary-text text-xs whitespace-nowrap font-semibold">
                                      {rowIndex + 2}
                                    </td>
                                    {Object.keys(row).map((key) => {
                                      const value = row[key]
                                      return (
                                        <td
                                          key={key}
                                          className="py-2 px-3 text-secondary-text text-xs whitespace-nowrap"
                                        >
                                          {value !== null && value !== undefined && value !== ''
                                            ? typeof value === 'object'
                                              ? JSON.stringify(value)
                                              : String(value)
                                            : '-'}
                                        </td>
                                      )
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="mt-2 text-xs text-secondary-text font-nunito text-center">
                            Total: {worksheetData[worksheet.worksheet].length} registro(s) exibido(s)
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-4 text-secondary-text font-nunito text-sm">
                          <p className="mb-2">
                            {worksheet.successCount} registro(s) cadastrado(s) com sucesso.
                          </p>
                          <p className="text-xs text-gray-500">
                            Não foi possível carregar os dados do arquivo XLSX.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Mensagens de sucesso ou erro geral */}
      {resultadoAnalise.mensagens.length > 0 && (
        <div className={`mb-6 rounded-lg border p-4 ${
          resultadoAnalise.sucesso 
            ? 'border-green-200 bg-green-50' 
            : 'border-red-200 bg-red-50'
        }`}>
          <div className="flex items-start gap-3">
            {resultadoAnalise.sucesso ? (
              <MdCheckCircle className="text-green-600 text-2xl flex-shrink-0 mt-0.5" />
            ) : (
              <MdError className="text-red-600 text-2xl flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <h4 className={`font-semibold font-exo text-sm mb-2 ${
                resultadoAnalise.sucesso ? 'text-green-800' : 'text-red-800'
              }`}>
                {resultadoAnalise.sucesso ? 'Processamento Concluído' : 'Erro no Processamento'}
              </h4>
              <ul className={`space-y-1 text-sm font-nunito ${
                resultadoAnalise.sucesso ? 'text-green-700' : 'text-red-700'
              }`}>
                {resultadoAnalise.mensagens.map((msg, index) => (
                  <li key={index}>• {msg}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Lista de erros */}
      {resultadoAnalise.erros.length > 0 && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <MdError className="text-red-600 text-2xl flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-red-800 font-semibold font-exo text-sm mb-2">
                Erros Encontrados ({resultadoAnalise.erros.length})
                {resultadoAnalise.totalErrorCount !== undefined && (
                  <span className="text-xs font-normal ml-2">
                    (Total: {resultadoAnalise.totalErrorCount})
                  </span>
                )}
              </h4>
              <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-hide">
                {resultadoAnalise.erros.map((erro, index) => (
                  <div
                    key={index}
                    className="text-sm text-red-700 font-nunito bg-white rounded p-2 border border-red-100"
                  >
                    <p className="font-semibold">
                      Linha {erro.linha} - Campo: {erro.campo}
                    </p>
                    <p className="text-xs mt-1">{erro.mensagem}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botões de ação */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between pt-6 border-t border-dashed border-[#E4E7F4] mt-4">
        <button
          onClick={onBack}
          className="h-8 px-10 rounded-lg border-2 border-primary bg-white text-primary font-semibold font-exo text-sm hover:bg-primary/10 transition-colors flex items-center gap-2"
        >
          <MdArrowBack size={18} />
          Voltar
        </button>
        <button
          onClick={onNext}
          className="h-8 px-10 rounded-lg bg-primary text-white font-semibold font-exo text-sm hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          Continuar
          <MdArrowForward size={18} />
        </button>
      </div>
    </div>
  )
}

/**
 * Step 4: Finalização
 */
function Step4Finalizacao({
  resultadoAnalise,
  onFinalizar,
}: {
  resultadoAnalise: {
    sucesso: boolean
    mensagens: string[]
    erros: Array<{ linha: number; campo: string; mensagem: string }>
    dadosCadastrados?: any[]
  } | null
  onFinalizar: () => void
}) {
  return (
    <div className="rounded-[24px] border border-[#E5E7F2] bg-white p-4 shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
      {/* Título */}
      <div className="flex flex-col gap-2 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-primary text-xl font-semibold font-exo">Processo Finalizado</h3>
          <div className="flex-1 h-[2px] bg-primary/50" />
        </div>
        <p className="text-sm text-secondary-text font-nunito">
          O processo de importação foi concluído com sucesso
        </p>
      </div>

      {/* Mensagem de sucesso */}
      <div className="rounded-lg border border-green-200 bg-green-50 p-6 mb-6 text-center">
        <MdCheckCircle className="text-green-600 text-5xl mx-auto mb-4" />
        <h4 className="text-green-800 font-semibold font-exo text-lg mb-2">
          Importação Concluída!
        </h4>
        <p className="text-sm text-green-700 font-nunito">
          {resultadoAnalise?.mensagens.join(' ') ||
            'Os dados foram processados e cadastrados no sistema.'}
        </p>
      </div>

      {/* Listagem de dados cadastrados (se houver) */}
      {resultadoAnalise?.dadosCadastrados && resultadoAnalise.dadosCadastrados.length > 0 && (
        <div className="mb-6">
          <h4 className="text-primary-text font-semibold font-exo text-base mb-3">
            Dados Cadastrados
          </h4>
          <div className="rounded-lg border border-[#E6E9F4] bg-gray-50 p-4 max-h-96 overflow-y-auto">
            <p className="text-sm text-secondary-text font-nunito">
              Listagem de dados cadastrados será implementada aqui
            </p>
          </div>
        </div>
      )}

      {/* Botão Finalizar */}
      <div className="flex justify-center pt-6 border-t border-dashed border-[#E4E7F4] mt-4">
        <button
          onClick={onFinalizar}
          className="h-8 px-10 rounded-lg bg-primary text-white font-semibold font-exo text-sm hover:bg-primary/90 transition-colors"
        >
          Finalizar
        </button>
      </div>
    </div>
  )
}
