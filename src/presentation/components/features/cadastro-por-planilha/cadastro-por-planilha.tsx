'use client'

import { useState } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast } from '@/src/shared/utils/toast'
import {
  MdUpload,
  MdDescription,
  MdDownload,
  MdCheckCircle,
  MdError,
  MdArrowForward,
  MdArrowBack,
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
        
        // Se tiver resultados no erro, processar
        if (responseData.results) {
          const processedResult = processarResultadoAPI(responseData.results, false)
          setResultadoAnalise(processedResult)
          setSelectedStep(2)
        }
        
        setIsUploading(false)
        showToast.errorLoading(toastId, errorMessage)
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
          <div className="mt-3 flex items-center gap-2 text-sm text-primary-text">
            <span className="font-semibold">Arquivo selecionado:</span>
            <span>{arquivo.name}</span>
            <span className="text-secondary-text">
              ({(arquivo.size / 1024).toFixed(2)} KB)
            </span>
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
      }>
    }>
  } | null
  onBack: () => void
  onNext: () => void
}) {
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

      {/* Resumo por Worksheet */}
      {resultadoAnalise.worksheetResults && resultadoAnalise.worksheetResults.length > 0 && (
        <div className="mb-6 rounded-lg border border-[#E6E9F4] bg-gradient-to-br from-[#F9FAFF] to-white p-4">
          <h4 className="text-primary-text font-semibold font-exo text-base mb-3">
            Resumo por Worksheet
          </h4>
          <div className="space-y-3">
            {resultadoAnalise.worksheetResults.map((worksheet, index) => (
              <div
                key={index}
                className="bg-white rounded-lg border border-[#E6E9F4] p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-primary-text font-exo text-sm">
                    {worksheet.worksheet}
                  </span>
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
            ))}
          </div>
        </div>
      )}

      {/* Mensagens de sucesso */}
      {resultadoAnalise.sucesso && resultadoAnalise.mensagens.length > 0 && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-start gap-3">
            <MdCheckCircle className="text-green-600 text-2xl flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-green-800 font-semibold font-exo text-sm mb-2">
                Processamento Concluído
              </h4>
              <ul className="space-y-1 text-sm text-green-700 font-nunito">
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
