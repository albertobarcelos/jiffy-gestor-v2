/**
 * Hook de inicialização do Next.js (servidor Node).
 * Garante que API_TLS_SKIP_VERIFY do .env.local funcione mesmo ao rodar `next dev` direto,
 * não só via `scripts/dev-server.js`.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  if (process.env.API_TLS_SKIP_VERIFY?.trim().toLowerCase() === 'true') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
    console.warn(
      '⚠️  API_TLS_SKIP_VERIFY=true: verificação TLS desabilitada (somente desenvolvimento local).'
    )
  }
}
