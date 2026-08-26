/**
 * Cliente HTTP para o BFF Next.js (`/api/*`) a partir do browser ou do servidor.
 * Não depende da camada de presentation (diferente de fetchGestorApi).
 */
export async function fetchBffJson<T>(
  url: string,
  token: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const message =
      (errorData as { message?: string }).message ||
      (errorData as { error?: string }).error ||
      'Erro na requisição'
    throw new Error(message)
  }

  return (await response.json()) as T
}

export async function fetchBffVoid(
  url: string,
  token: string,
  init?: RequestInit
): Promise<void> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const message =
      (errorData as { message?: string }).message ||
      (errorData as { error?: string }).error ||
      'Erro na requisição'
    throw new Error(message)
  }
}

export async function fetchBffDelete(url: string, token: string): Promise<void> {
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const message =
      (errorData as { message?: string }).message ||
      (errorData as { error?: string }).error ||
      'Erro na requisição'
    throw new Error(message)
  }
}

export async function fetchBffFormData<T>(
  url: string,
  token: string,
  form: FormData,
  init?: Omit<RequestInit, 'body' | 'headers'>
): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
    cache: 'no-store',
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const message =
      (errorData as { message?: string }).message ||
      (errorData as { error?: string }).error ||
      'Erro na requisição'
    throw new Error(message)
  }

  return (await response.json()) as T
}
