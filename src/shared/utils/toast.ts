import toast from 'react-hot-toast'

/**
 * Utilitários para exibir notificações toast
 */
export const showToast = {
  /**
   * Exibe uma notificação de sucesso
   */
  success: (message: string) => {
    toast.success(message, {
      duration: 4000,
    })
  },

  /**
   * Exibe uma notificação de erro
   */
  error: (message: string) => {
    toast.error(message, {
      duration: 5000,
    })
  },

  /**
   * Exibe uma notificação de informação
   */
  info: (message: string) => {
    toast(message, {
      icon: 'ℹ️',
      duration: 4000,
    })
  },

  /**
   * Exibe uma notificação de aviso
   */
  warning: (message: string) => {
    toast(message, {
      icon: '⚠️',
      duration: 4000,
    })
  },

  /**
   * Exibe uma notificação de carregamento
   */
  loading: (message: string) => {
    return toast.loading(message)
  },

  /**
   * Atualiza uma notificação de carregamento para sucesso
   */
  successLoading: (toastId: string, message: string) => {
    toast.success(message, {
      id: toastId,
    })
  },

  /**
   * Atualiza uma notificação de carregamento para erro
   */
  errorLoading: (toastId: string, message: string) => {
    toast.error(message, {
      id: toastId,
    })
  },

  /**
   * Limpa todos os toasts ativos
   */
  dismissAll: () => {
    toast.dismiss()
  },
}

/**
 * Trata erros de API e exibe mensagens amigáveis
 */
export function handleApiError(error: unknown): string {
  if (error instanceof Error) {
    // Erros conhecidos
    if (error.message.includes('Token')) {
      return 'Sessão expirada. Faça login novamente.'
    }
    if (error.message.includes('Network')) {
      return 'Erro de conexão. Verifique sua internet.'
    }
    if (error.message.includes('404')) {
      return 'Recurso não encontrado.'
    }
    if (error.message.includes('403')) {
      return 'Você não tem permissão para esta ação.'
    }
    if (error.message.includes('401')) {
      return 'Não autorizado. Faça login novamente.'
    }
    if (error.message.includes('500')) {
      return 'Erro interno do servidor. Tente novamente mais tarde.'
    }
    return error.message
  }
  return 'Ocorreu um erro inesperado. Tente novamente.'
}

