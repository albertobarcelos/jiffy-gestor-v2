export type GestorApiSession = {
  getAccessToken: () => string | null | undefined
  syncAccessToken: (token: string) => boolean
}

let session: GestorApiSession | null = null

export function configureGestorApiSession(next: GestorApiSession): void {
  session = next
}

export function getGestorApiSession(): GestorApiSession | null {
  return session
}
