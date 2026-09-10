export function mensagemIndicaForaDaCobertura(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes('cobertura') ||
    lower.includes('fora da área') ||
    lower.includes('fora da area') ||
    lower.includes('fora do raio') ||
    lower.includes('raio de entrega') ||
    lower.includes('área de entrega') ||
    lower.includes('area de entrega') ||
    lower.includes('coberto por nenhuma') ||
    lower.includes('não atend') ||
    lower.includes('nao atend')
  )
}
