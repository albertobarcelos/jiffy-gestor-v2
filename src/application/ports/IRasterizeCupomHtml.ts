/** Porta da application: rasteriza HTML do cupom gráfico sem conhecer html2canvas/DOM. */
export type RasterizeCupomHtmlToPngBase64 = (
  html: string,
  options: { widthPx: number; scale?: number }
) => Promise<string>
