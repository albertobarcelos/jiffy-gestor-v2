import type ExcelJS from 'exceljs'

/** Cores do tema Jiffy (`app/globals.css`). */
export const EXCEL_CORES = {
  secondary: 'FF530CA3',
  alternate: 'FF8338EC',
  branco: 'FFFFFFFF',
  preto: 'FF000000',
  border: 'FFD1D5DB',
  zebra: 'FFF9FAFB',
} as const

export const EXCEL_FMT = {
  moeda: '"R$" #,##0.00',
  /** Formato percentual nativo do Excel: valor 0,999 → exibe 99,90% */
  percentual: '0.00%',
  inteiro: '#,##0',
} as const

export const EXCEL_BORDA_FINA: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: EXCEL_CORES.border } },
  left: { style: 'thin', color: { argb: EXCEL_CORES.border } },
  bottom: { style: 'thin', color: { argb: EXCEL_CORES.border } },
  right: { style: 'thin', color: { argb: EXCEL_CORES.border } },
}

export function aplicarEstiloTitulo(cell: ExcelJS.Cell): void {
  cell.font = { bold: true, size: 16, color: { argb: EXCEL_CORES.preto } }
  cell.alignment = { vertical: 'middle' }
}

export function aplicarEstiloSecao(cell: ExcelJS.Cell): void {
  cell.font = { bold: true, size: 12, color: { argb: EXCEL_CORES.branco } }
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: EXCEL_CORES.secondary },
  }
  cell.alignment = { vertical: 'middle' }
  cell.border = EXCEL_BORDA_FINA
}

export function aplicarEstiloCabecalhoTabela(row: ExcelJS.Row, colunas: number): void {
  for (let c = 1; c <= colunas; c++) {
    const cell = row.getCell(c)
    cell.font = { bold: true, color: { argb: EXCEL_CORES.branco }, size: 11 }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: EXCEL_CORES.secondary },
    }
    cell.alignment = { vertical: 'middle', horizontal: c === 1 ? 'left' : 'center' }
    cell.border = EXCEL_BORDA_FINA
  }
  row.height = 22
}

export function aplicarEstiloTotal(row: ExcelJS.Row, colunas: number): void {
  for (let c = 1; c <= colunas; c++) {
    const cell = row.getCell(c)
    cell.font = { bold: true, size: 11, color: { argb: EXCEL_CORES.branco } }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: EXCEL_CORES.alternate },
    }
    cell.border = {
      ...EXCEL_BORDA_FINA,
      top: { style: 'medium', color: { argb: EXCEL_CORES.secondary } },
      bottom: { style: 'medium', color: { argb: EXCEL_CORES.secondary } },
    }
    cell.alignment = { vertical: 'middle' }
  }
  row.height = 22
}

export function aplicarBordasLinha(row: ExcelJS.Row, colunas: number, zebra?: boolean): void {
  for (let c = 1; c <= colunas; c++) {
    const cell = row.getCell(c)
    cell.font = { size: 11, color: { argb: EXCEL_CORES.preto } }
    cell.border = EXCEL_BORDA_FINA
    cell.alignment = { vertical: 'middle', wrapText: c > 1 }
    if (zebra) {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: EXCEL_CORES.zebra },
      }
    }
  }
}

/** Ajusta largura das colunas com base no conteúdo (com limites). */
export function ajustarLarguraColunas(
  sheet: ExcelJS.Worksheet,
  opts?: { min?: number; max?: number; padding?: number }
): void {
  const min = opts?.min ?? 10
  const max = opts?.max ?? 48
  const padding = opts?.padding ?? 2

  sheet.columns.forEach(column => {
    if (!column || !column.eachCell) return
    let larguraMax = min
    column.eachCell({ includeEmpty: false }, cell => {
      const texto =
        cell.value == null
          ? ''
          : typeof cell.value === 'object' && 'richText' in (cell.value as object)
            ? String((cell.value as ExcelJS.CellRichTextValue).richText?.map(r => r.text).join(''))
            : String(cell.value)
      larguraMax = Math.max(larguraMax, texto.length + padding)
    })
    column.width = Math.min(Math.max(larguraMax, min), max)
  })
}

export async function baixarExcelWorkbook(
  workbook: ExcelJS.Workbook,
  filename: string
): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
