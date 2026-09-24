/**
 * Cliente HTTP para o BFF Next.js (`/api/*`) a partir do browser ou do servidor.
 * Não depende da camada de presentation (diferente de fetchGestorApi).
 */

export class BffHttpError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message)
    this.name = 'BffHttpError'
  }
}

export function isBffNotFound(error: unknown): boolean {
  return error instanceof BffHttpError && error.status === 404
}

async function rejeitarSeNaoOk(response: Response): Promise<void> {
  if (response.ok) return
  const errorData = await response.json().catch(() => ({}))
  const message =
    (errorData as { message?: string }).message ||
    (errorData as { error?: string }).error ||
    'Erro na requisição'
  throw new BffHttpError(message, response.status)
}

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

  await rejeitarSeNaoOk(response)
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

  await rejeitarSeNaoOk(response)
}

export async function fetchBffDelete(url: string, token: string): Promise<void> {
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  })

  await rejeitarSeNaoOk(response)
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

  await rejeitarSeNaoOk(response)
  return (await response.json()) as T
}
