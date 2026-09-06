/** Tamanho alinhado ao pin padrão vermelho do Google Maps. */
const PIN_WIDTH = 27
const PIN_HEIGHT = 43

function montarSvgPin(cor: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="${PIN_WIDTH}" height="${PIN_HEIGHT}">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="${cor}"/>
    <circle cx="12" cy="11" r="4.5" fill="#ffffff"/>
  </svg>`
}

function montarSvgPinAzul(): string {
  return montarSvgPin('#2563eb')
}

function montarSvgPinVermelho(): string {
  return montarSvgPin('#EA4335')
}

function iconePinGoogle(svg: string): google.maps.Icon | undefined {
  if (typeof google === 'undefined') return undefined
  const url = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
  return {
    url,
    scaledSize: new google.maps.Size(PIN_WIDTH, PIN_HEIGHT),
    anchor: new google.maps.Point(PIN_WIDTH / 2, PIN_HEIGHT),
  }
}

export function criarOpcoesIconePinPreferencia(): google.maps.Icon | undefined {
  return iconePinGoogle(montarSvgPinAzul())
}

/** Pin da loja na cobertura — gota vermelha no estilo Google. */
export function criarOpcoesIconePinLoja(): google.maps.Icon | undefined {
  return iconePinGoogle(montarSvgPinVermelho())
}

export function labelPinPreferenciaMapa(): string {
  return 'Ponto de entrega'
}
