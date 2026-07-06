import localFont from 'next/font/local'

/**
 * Exo 2 SemiBold (600) self-hosted — evita fetch ao Google Fonts no `next build`
 * (redes com proxy/SSL corporativo quebram `next/font/google`).
 */
export const exo2CabecalhoFaturamento = localFont({
  src: [
    {
      path: '../../../app/fonts/exo-2/exo-2-latin-ext-600-normal.woff2',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../../../app/fonts/exo-2/exo-2-latin-600-normal.woff2',
      weight: '600',
      style: 'normal',
    },
  ],
  display: 'swap',
})
