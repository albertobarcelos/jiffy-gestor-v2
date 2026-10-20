'use client'

import {
  nomeFicheiroInstaladorJiffyPrint,
  urlInstaladorJiffyPrint,
} from '@/src/shared/constants/jiffyPrintSetup'

/** Download compacto do Jiffy Print, no mesmo formato do atalho do Fredy. */
export function BaixarJiffyPrintCard() {
  return (
    <a
      href={urlInstaladorJiffyPrint()}
      download={nomeFicheiroInstaladorJiffyPrint()}
      title="Baixar Jiffy Print para Windows — Windows 10 e 11, 64 bits"
      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white py-1 pl-1 pr-3 text-sm font-semibold text-primary-text hover:bg-gray-50"
    >
      <img
        src="/jiffy-print-icon.png"
        alt=""
        className="h-8 w-8 rounded-md"
        width={32}
        height={32}
      />
      Baixar Jiffy Print
    </a>
  )
}
